import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Circle, Square, Loader2, UserPlus, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SeoHead from "@/components/SeoHead";

type Room = {
  booking_id: string;
  role: "host" | "guest";
  display_name: string;
  scheduled_at: string | null;
  status: string;
};

type SignalMessage =
  | { type: "offer"; sdp: RTCSessionDescriptionInit; from: string; to?: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; from: string; to?: string }
  | { type: "ice"; candidate: RTCIceCandidateInit; from: string; to?: string }
  | { type: "hello"; from: string; role: "host" | "guest"; name?: string; reply?: boolean; to?: string }
  | { type: "knock"; from: string; name?: string; to?: string }
  | { type: "admit"; from: string; to: string }
  | { type: "deny"; from: string; to: string }
  | { type: "nudge_relay"; from: string; to: string }
  | { type: "bye"; from: string; to?: string };

const PEER_ID = crypto.randomUUID();

type Stage = "loading" | "preflight" | "waiting" | "calling" | "connected" | "ended" | "failed" | "denied";

const CONNECT_TIMEOUT_MS = 15000;

type RemotePeer = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  name: string;
  videoEl?: HTMLVideoElement | null;
  pendingIce: RTCIceCandidateInit[];
};

type PendingGuest = { peerId: string; name: string; at: number };

const CallRoom = () => {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";

  const [room, setRoom] = useState<Room | null>(null);
  const [iceServers, setIceServers] = useState<RTCIceServer[] | null>(null);
  const [relayServers, setRelayServers] = useState<RTCIceServer[]>([]);
  const relayServersRef = useRef<RTCIceServer[]>([]);
  const relayRetriedRef = useRef<Set<string>>(new Set());
  const relayWatchdogRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Stage>("loading");
  const [preflightReady, setPreflightReady] = useState(false);
  const [preflightLoading, setPreflightLoading] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);

  // Multi-peer state
  const [pendingGuests, setPendingGuests] = useState<PendingGuest[]>([]);
  const [remotePeers, setRemotePeers] = useState<Array<{ peerId: string; name: string }>>([]);
  const [remotePeerTicks, setRemotePeerTicks] = useState<Record<string, number>>({});

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  // Guest-side single remote (host) video
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Host-side: map of peerId -> video element
  const remoteVideoEls = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const remoteAudioEls = useRef<Map<string, HTMLAudioElement | null>>(new Map());

  // Guest-side single PC (to host)
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hostPeerIdRef = useRef<string | null>(null);
  const guestPendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  // Host-side peers map
  const peersRef = useRef<Map<string, RemotePeer>>(new Map());
  const deniedRef = useRef<Set<string>>(new Set());

  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const watchdogRef = useRef<number | null>(null);
  const failTimerRef = useRef<number | null>(null);
  const knockTimerRef = useRef<number | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [failMessage, setFailMessage] = useState<string>("");

  const isHost = room?.role === "host";

  // 1. Verify token + fetch ICE config
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!bookingId || !token) {
        setError("Invalid call link");
        return;
      }
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("get-call-config", {
          body: { booking_id: bookingId, token },
        });
        if (cancel) return;
        if (fnErr || !data?.ok) {
          setError(data?.error === "invalid_token" ? "This call link is invalid or expired." : "Unable to join call.");
          return;
        }
        setRoom(data.room);
        setIceServers(data.ice_servers);
        const relays: RTCIceServer[] = Array.isArray(data.relay_only_ice_servers) ? data.relay_only_ice_servers : [];
        setRelayServers(relays);
        relayServersRef.current = relays;
        setStatus("preflight");
      } catch (e) {
        if (!cancel) setError(String((e as Error)?.message ?? e));
      }
    })();
    return () => { cancel = true; };
  }, [bookingId, token]);

  const handleMediaError = useCallback((e: unknown) => {
    const err = e as DOMException;
    const inIframe = window.self !== window.top;
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isIOSInAppBrowser =
      isIOS && (!/Safari\//.test(ua) || !/Version\//.test(ua) ||
        /FBAN|FBAV|Instagram|Line|GSA\/|CriOS|FxiOS|EdgiOS|GMail|Outlook|LinkedInApp|Snapchat|TikTok/i.test(ua));
    let msg = "Couldn't access camera/microphone.";
    if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
      if (inIframe) {
        msg = "Camera/mic blocked because this page is loaded inside a preview frame. Open this call link in a new browser tab and try again.";
      } else if (isIOSInAppBrowser) {
        msg = "It looks like you opened this link inside an email or social app (Gmail, Outlook, Instagram, etc.). These in-app browsers block camera and microphone access on iPhone. Tap the ••• menu (or the share icon) and choose \"Open in Safari\", then try again.";
      } else if (isIOS) {
        msg = "Camera and microphone are blocked for this site in Safari. Open Settings → Safari → Camera / Microphone and set this site to Allow, then reload. If you tapped the link from an email or social app, open it in Safari directly.";
      } else {
        msg = "Permission was blocked. Click the camera icon in your browser's address bar, set Camera and Microphone to Allow for this site, then reload.";
      }
    } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
      msg = "No camera or microphone was found on this device.";
    } else if (err?.name === "NotReadableError") {
      msg = "Another app is using your camera or microphone. Close Zoom/Meet/Teams/OBS/FaceTime and try again.";
    } else if (err?.message) {
      msg = `Couldn't access camera/microphone: ${err.message}`;
    }
    setError(msg);
  }, []);

  // Acquire media for the preflight preview
  const startPreflight = useCallback(async () => {
    if (preflightReady || preflightLoading) return;
    setPreflightLoading(true);
    try {
      const ua = navigator.userAgent || "";
      const isMobile = /iPad|iPhone|iPod|Android/.test(ua);
      // Strict `max` constraints cause silent OverconstrainedError on some
      // iPhone front cams and Samsung devices. Use `ideal` only on mobile.
      const videoConstraints: MediaTrackConstraints = isMobile
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }
        : { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 30, max: 30 } };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
      const aTrack = stream.getAudioTracks()[0];
      if (aTrack) aTrack.enabled = micOn;
      if (cameraTrackRef.current) cameraTrackRef.current.enabled = camOn;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      setPreflightReady(true);
    } catch (e) {
      handleMediaError(e);
    } finally {
      setPreflightLoading(false);
    }
  }, [preflightReady, preflightLoading, micOn, camOn, handleMediaError]);

  const togglePreflightMic = () => {
    setMicOn((v) => {
      const next = !v;
      const t = localStreamRef.current?.getAudioTracks()[0];
      if (t) t.enabled = next;
      return next;
    });
  };
  const togglePreflightCam = () => {
    setCamOn((v) => {
      const next = !v;
      const t = cameraTrackRef.current;
      if (t) t.enabled = next;
      return next;
    });
  };

  const sendSignal = useCallback((msg: SignalMessage) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload: msg });
  }, []);

  const tuneVideoSender = useCallback(async (
    sender: RTCRtpSender | undefined,
    mode: "camera" | "screen",
  ) => {
    if (!sender) return;
    try {
      const params = sender.getParameters();
      (params as RTCRtpSendParameters).degradationPreference =
        mode === "screen" ? "maintain-resolution" : "maintain-framerate";
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = mode === "screen" ? 2_500_000 : 1_200_000;
      params.encodings[0].maxFramerate = mode === "screen" ? 15 : 30;
      await sender.setParameters(params);
    } catch (e) {
      console.warn("tuneVideoSender failed", e);
    }
  }, []);

  const markFailed = useCallback((message: string) => {
    setFailMessage(message);
    setStatus("failed");
  }, []);

  // Reconfigure an existing PC to relay-only (TURN) and restart ICE.
  // Used when the initial STUN/host-candidate path fails to connect
  // (very common on mobile + guest WiFi with client isolation).
  const switchPeerToRelayOnly = useCallback((pc: RTCPeerConnection) => {
    const relay = relayServersRef.current;
    if (!relay || relay.length === 0) {
      console.warn("[call] no TURN relay servers available — cannot fall back");
      return false;
    }
    try {
      pc.setConfiguration({ iceServers: relay, iceTransportPolicy: "relay" });
      console.log("[call] switched PC to relay-only");
      return true;
    } catch (e) {
      console.warn("[call] setConfiguration(relay-only) failed", e);
      return false;
    }
  }, []);

  // ---------------- GUEST side helpers ----------------

  const createGuestPeer = useCallback((): RTCPeerConnection => {
    const safeIce: RTCIceServer[] = [];
    for (const s of iceServers ?? []) {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      const cleaned = urls.filter((u): u is string => typeof u === "string" && /^(stun|turn|turns):/i.test(u));
      if (cleaned.length) safeIce.push({ ...s, urls: cleaned });
    }
    const pc = new RTCPeerConnection({ iceServers: safeIce });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const c = e.candidate;
        console.log("[call] guest local cand", c.type ?? "?", c.protocol ?? "", c.address ?? c.candidate?.slice(0, 60));
        sendSignal({ type: "ice", candidate: c.toJSON(), from: PEER_ID, to: hostPeerIdRef.current ?? undefined });
      }
    };
    pc.ontrack = (e) => {
      let remote = remoteStreamRef.current;
      if (!remote) {
        remote = new MediaStream();
        remoteStreamRef.current = remote;
      }
      try { remote.addTrack(e.track); } catch { /* dup */ }
      const apply = () => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remote) {
          remoteVideoRef.current.srcObject = remote;
          remoteVideoRef.current.play().catch(() => { /* noop */ });
        }
      };
      e.track.onunmute = apply;
      apply();
    };
    const markConnected = () => {
      setStatus("connected");
      if (watchdogRef.current) { window.clearTimeout(watchdogRef.current); watchdogRef.current = null; }
      if (failTimerRef.current) { window.clearTimeout(failTimerRef.current); failTimerRef.current = null; }
    };
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "connected" || s === "completed") markConnected();
      if (s === "failed") {
        try { pc.restartIce(); } catch { /* noop */ }
        if (!failTimerRef.current) {
          failTimerRef.current = window.setTimeout(() => {
            const cur = pc.iceConnectionState;
            failTimerRef.current = null;
            if (cur !== "connected" && cur !== "completed") {
              markFailed("The call could not connect. Please reload and try again.");
            }
          }, 8000);
        }
      }
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") markConnected();
      if (s === "failed") {
        if (failTimerRef.current) return;
        failTimerRef.current = window.setTimeout(() => {
          failTimerRef.current = null;
          if (pc.connectionState === "failed") {
            markFailed("The call could not connect. Please reload and try again.");
          }
        }, 4000);
      }
    };
    return pc;
  }, [iceServers, sendSignal, markFailed]);

  // ---------------- HOST side helpers ----------------

  const createHostPeerFor = useCallback((peerId: string, name: string): RemotePeer => {
    const safeIce: RTCIceServer[] = [];
    for (const s of iceServers ?? []) {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      const cleaned = urls.filter((u): u is string => typeof u === "string" && /^(stun|turn|turns):/i.test(u));
      if (cleaned.length) safeIce.push({ ...s, urls: cleaned });
    }
    const pc = new RTCPeerConnection({ iceServers: safeIce });
    const stream = new MediaStream();
    const peer: RemotePeer = { pc, stream, name, pendingIce: [] };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const c = e.candidate;
        console.log("[call] host local cand", peerId, c.type ?? "?", c.protocol ?? "", c.address ?? c.candidate?.slice(0, 60));
        sendSignal({ type: "ice", candidate: c.toJSON(), from: PEER_ID, to: peerId });
      }
    };
    const attachToEl = (force = false) => {
      const el = remoteVideoEls.current.get(peerId);
      if (el && (force || el.srcObject !== peer.stream)) {
        if (force) el.srcObject = null;
        el.muted = true;
        el.srcObject = peer.stream;
      }
      if (el) el.play().catch(() => { /* noop */ });
      const audio = remoteAudioEls.current.get(peerId);
      if (audio && audio.srcObject !== peer.stream) {
        audio.srcObject = peer.stream;
      }
      if (audio) audio.play().catch(() => { /* noop */ });
    };
    pc.ontrack = (e) => {
      const incoming = e.streams[0];
      if (incoming) peer.stream = incoming;
      for (const track of incoming?.getTracks() ?? [e.track]) {
        if (!peer.stream.getTracks().some((t) => t.id === track.id)) {
          peer.stream.addTrack(track);
        }
      }
      setRemotePeerTicks((ticks) => ({ ...ticks, [peerId]: (ticks[peerId] ?? 0) + 1 }));
      console.log("[call] host ontrack from", peerId, e.track.kind);
      attachToEl(e.track.kind === "video");
      // Retry attaching for a few frames in case the <video> ref hasn't mounted yet
      let tries = 0;
      const iv = window.setInterval(() => {
        attachToEl();
        if (++tries > 20 || remoteVideoEls.current.get(peerId)?.srcObject === peer.stream) {
          window.clearInterval(iv);
        }
      }, 100);
      e.track.onunmute = () => attachToEl();
    };
    pc.oniceconnectionstatechange = () => {
      console.log("[call] host ice state", peerId, pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        try { pc.restartIce(); } catch { /* noop */ }
      }
    };
    pc.onconnectionstatechange = () => {
      console.log("[call] host conn state", peerId, pc.connectionState);
      if (pc.connectionState === "connected") {
        setStatus((s) => (s === "waiting" || s === "calling" ? "connected" : s));
      }
      // Do NOT auto-remove on "failed" — momentary blips during ICE
      // negotiation flip to failed and recover. Only remove when the peer
      // explicitly says bye or the host clicks End.
    };


    // Attach local tracks (current camera + audio, or active screen)
    const localStream = screenStreamRef.current ?? localStreamRef.current;
    if (localStream) {
      for (const t of localStream.getTracks()) {
        pc.addTrack(t, localStream);
      }
    }

    peersRef.current.set(peerId, peer);
    setRemotePeers((arr) => arr.some((p) => p.peerId === peerId) ? arr : [...arr, { peerId, name }]);
    return peer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iceServers, sendSignal]);

  const removeHostPeer = useCallback((peerId: string) => {
    const p = peersRef.current.get(peerId);
    if (p) {
      try { p.pc.close(); } catch { /* noop */ }
      peersRef.current.delete(peerId);
    }
    remoteVideoEls.current.delete(peerId);
    remoteAudioEls.current.delete(peerId);
    setRemotePeers((arr) => arr.filter((x) => x.peerId !== peerId));
  }, []);

  const admitGuest = useCallback(async (peerId: string, name: string) => {
    setPendingGuests((arr) => arr.filter((g) => g.peerId !== peerId));
    if (peersRef.current.has(peerId)) return;
    const peer = createHostPeerFor(peerId, name);
    sendSignal({ type: "admit", from: PEER_ID, to: peerId });
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      sendSignal({ type: "offer", sdp: offer, from: PEER_ID, to: peerId });
      setStatus((s) => (s === "waiting" ? "calling" : s));
    } catch (e) {
      console.error("[call] host offer failed", e);
      removeHostPeer(peerId);
    }
  }, [createHostPeerFor, removeHostPeer, sendSignal]);

  const denyGuest = useCallback((peerId: string) => {
    deniedRef.current.add(peerId);
    setPendingGuests((arr) => arr.filter((g) => g.peerId !== peerId));
    sendSignal({ type: "deny", from: PEER_ID, to: peerId });
  }, [sendSignal]);

  // ---------------- Enter waiting room (both roles) ----------------

  const enterWaitingRoom = useCallback(async () => {
    if (!room || !iceServers || !localStreamRef.current) return;
    try {
      const stream = localStreamRef.current;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const channel = supabase.channel(`call:${room.booking_id}`, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
        const msg = payload as SignalMessage;
        if (msg.from === PEER_ID) return;
        // Address filter
        if (msg.type !== "hello" && msg.type !== "knock" && "to" in msg && msg.to && msg.to !== PEER_ID) return;
        if ((msg.type === "hello" || msg.type === "knock") && msg.to && msg.to !== PEER_ID) return;

        try {
          if (isHost) {
            // ----- HOST -----
            if (msg.type === "hello" || msg.type === "knock") {
              if (msg.from === PEER_ID) return;
              if (deniedRef.current.has(msg.from)) return;
              if (peersRef.current.has(msg.from)) return;
              const name = (msg as { name?: string }).name?.trim() || "Guest";
              // Reply so the guest learns our PEER_ID
              sendSignal({ type: "hello", from: PEER_ID, role: "host", reply: true, to: msg.from });
              setPendingGuests((arr) => {
                if (arr.some((g) => g.peerId === msg.from)) return arr;
                return [...arr, { peerId: msg.from, name, at: Date.now() }];
              });
            } else if (msg.type === "answer") {
              const p = peersRef.current.get(msg.from);
              if (!p) return;
              await p.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              for (const c of p.pendingIce) {
                try { await p.pc.addIceCandidate(c); } catch { /* noop */ }
              }
              p.pendingIce = [];
            } else if (msg.type === "ice") {
              const p = peersRef.current.get(msg.from);
              if (!p) return;
              if (!p.pc.remoteDescription) {
                p.pendingIce.push(msg.candidate);
              } else {
                try { await p.pc.addIceCandidate(msg.candidate); } catch (e) { console.warn("[call] ice add failed", e); }
              }
            } else if (msg.type === "bye") {
              removeHostPeer(msg.from);
            }
          } else {
            // ----- GUEST -----
            const peer = pcRef.current;
            if (msg.type === "hello" && msg.role === "host") {
              hostPeerIdRef.current = msg.from;
              if (!peer?.remoteDescription) {
                sendSignal({ type: "knock", from: PEER_ID, name: room.display_name || "Guest", to: msg.from });
              }
            } else if (msg.type === "admit") {
              hostPeerIdRef.current = msg.from;
              if (knockTimerRef.current) { window.clearInterval(knockTimerRef.current); knockTimerRef.current = null; }
              setStatus((s) => (s === "waiting" ? "calling" : s));
            } else if (msg.type === "deny") {
              if (knockTimerRef.current) { window.clearInterval(knockTimerRef.current); knockTimerRef.current = null; }
              setStatus("denied");
              try { pcRef.current?.close(); } catch { /* noop */ }
              pcRef.current = null;
            } else if (msg.type === "offer" && peer) {
              hostPeerIdRef.current = msg.from;
              setStatus((s) => (s === "calling" || s === "connected" ? s : "calling"));
              await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              const queue = guestPendingIceRef.current;
              guestPendingIceRef.current = [];
              for (const c of queue) {
                try { await peer.addIceCandidate(c); } catch { /* noop */ }
              }
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              sendSignal({ type: "answer", sdp: answer, from: PEER_ID, to: msg.from });
              if (knockTimerRef.current) { window.clearInterval(knockTimerRef.current); knockTimerRef.current = null; }
            } else if (msg.type === "ice" && peer) {
              if (!peer.remoteDescription) {
                guestPendingIceRef.current.push(msg.candidate);
              } else {
                try { await peer.addIceCandidate(msg.candidate); } catch (e) { console.warn("[call] ice add failed", e); }
              }
            } else if (msg.type === "bye") {
              if (msg.from === hostPeerIdRef.current) {
                setStatus("ended");
              }
            }
          }
        } catch (e) {
          console.error("[call] signal handler error", e);
        }
      });

      if (!isHost) {
        const pc = createGuestPeer();
        pcRef.current = pc;
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      }

      channelRef.current = channel;

      await channel.subscribe(async (s) => {
        if (s === "SUBSCRIBED") {
          if (isHost) {
            // Announce host presence so any already-waiting guests learn our PEER_ID and re-knock.
            sendSignal({ type: "hello", from: PEER_ID, role: "host" });
          } else {
            const knock = () => sendSignal({ type: "knock", from: PEER_ID, name: room.display_name || "Guest", to: hostPeerIdRef.current ?? undefined });
            knock();
            if (knockTimerRef.current) window.clearInterval(knockTimerRef.current);
            knockTimerRef.current = window.setInterval(() => {
              if (pcRef.current?.remoteDescription) {
                if (knockTimerRef.current) { window.clearInterval(knockTimerRef.current); knockTimerRef.current = null; }
                return;
              }
              knock();
            }, 2000);
          }
        }
      });
      setStatus("waiting");
    } catch (e) {
      handleMediaError(e);
    }
  }, [room, iceServers, createGuestPeer, sendSignal, handleMediaError, isHost, removeHostPeer]);

  const hangup = useCallback(() => {
    sendSignal({ type: "bye", from: PEER_ID });
    if (isHost) {
      for (const [, p] of peersRef.current) {
        try { p.pc.close(); } catch { /* noop */ }
      }
      peersRef.current.clear();
      setRemotePeers([]);
      setRemotePeerTicks({});
    } else {
      try { pcRef.current?.close(); } catch { /* noop */ }
      pcRef.current = null;
    }
    remoteStreamRef.current = null;
    if (knockTimerRef.current) { window.clearInterval(knockTimerRef.current); knockTimerRef.current = null; }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current && supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setStatus("ended");
  }, [sendSignal, isHost]);

  useEffect(() => () => { hangup(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Soft watchdog
  useEffect(() => {
    if (status !== "calling") { setFailMessage(""); return; }
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    watchdogRef.current = window.setTimeout(() => {
      setFailMessage("Still connecting… this can take up to 30 seconds on slow networks.");
    }, CONNECT_TIMEOUT_MS);
    return () => {
      if (watchdogRef.current) { window.clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    };
  }, [status]);

  // Attach remote streams to grid video elements when refs become available
  useEffect(() => {
    for (const { peerId } of remotePeers) {
      const el = remoteVideoEls.current.get(peerId);
      const p = peersRef.current.get(peerId);
      if (el && p && el.srcObject !== p.stream) {
        el.muted = true;
        el.srcObject = p.stream;
        el.play().catch(() => { /* noop */ });
      }
      const audio = remoteAudioEls.current.get(peerId);
      if (audio && p && audio.srcObject !== p.stream) {
        audio.srcObject = p.stream;
        audio.play().catch(() => { /* noop */ });
      }
    }
  }, [remotePeers, remotePeerTicks]);

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
  };
  const toggleCam = () => {
    const t = cameraTrackRef.current;
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); }
  };

  const allVideoSenders = useCallback((): RTCRtpSender[] => {
    if (isHost) {
      const senders: RTCRtpSender[] = [];
      for (const [, p] of peersRef.current) {
        const s = p.pc.getSenders().find((x) => x.track?.kind === "video");
        if (s) senders.push(s);
      }
      return senders;
    }
    const s = pcRef.current?.getSenders().find((x) => x.track?.kind === "video");
    return s ? [s] : [];
  }, [isHost]);

  const toggleShare = async () => {
    const senders = allVideoSenders();
    if (senders.length === 0 && !sharing) return;

    if (!sharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 15, max: 15 } },
          audio: false,
        });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];
        for (const sender of senders) {
          await sender.replaceTrack(screenTrack);
          await tuneVideoSender(sender, "screen");
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = screen;
        setSharing(true);
        screenTrack.onended = () => { void revertShare(); };
      } catch {
        // user cancelled
      }
    } else {
      await revertShare();
    }
  };

  const revertShare = useCallback(async () => {
    const senders = allVideoSenders();
    const camTrack = cameraTrackRef.current;
    if (camTrack) {
      for (const sender of senders) {
        await sender.replaceTrack(camTrack);
        await tuneVideoSender(sender, "camera");
      }
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setSharing(false);
  }, [tuneVideoSender, allVideoSenders]);

  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!localStreamRef.current) return;
    try {
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const rec = new MediaRecorder(localStreamRef.current, { mimeType: mime });
      recordedChunksRef.current = [];
      recordStartRef.current = Date.now();
      rec.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const durationSec = Math.round((Date.now() - recordStartRef.current) / 1000);
        const fd = new FormData();
        fd.append("booking_id", bookingId);
        fd.append("token", token);
        fd.append("duration_seconds", String(durationSec));
        fd.append("file", blob, `call-${bookingId}-${Date.now()}.webm`);
        try {
          await supabase.functions.invoke("upload-call-recording", { body: fd });
        } catch (e) {
          console.warn("upload failed", e);
        }
        setRecording(false);
      };
      rec.start(1000);
      recorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      console.warn("recording unsupported", e);
    }
  };

  // --- Render ---
  if (error) {
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    const fullUrl = typeof window !== "undefined" ? window.location.href : "";
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <p className="text-2xl font-light mb-3">Unable to join the call</p>
          <p className="text-white/70 text-sm mb-6 leading-relaxed">{error}</p>
          <div className="flex flex-col gap-2">
            {inIframe && (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 rounded-2xl bg-white text-black hover:bg-white/90 font-medium flex items-center justify-center"
              >
                Open call in a new tab
              </a>
            )}
            <button
              onClick={() => { setError(null); setStatus("preflight"); }}
              className="h-11 rounded-2xl border border-white/20 hover:bg-white/[0.06] text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading" || !room) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (status === "preflight") {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isIOSInAppBrowser =
      isIOS && (!/Safari\//.test(ua) || !/Version\//.test(ua) ||
        /FBAN|FBAV|Instagram|Line|GSA\/|CriOS|FxiOS|EdgiOS|GMail|Outlook|LinkedInApp|Snapchat|TikTok/i.test(ua));
    const fullUrl = typeof window !== "undefined" ? window.location.href : "";
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-10">
        <SeoHead title="Join your Pixcellor call" description="Secure browser-based video call with the Pixcellor team." path="/call" noindex />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl p-6 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-2">Pixcellor</p>
          <h1 className="text-2xl font-light mb-1">Ready to join</h1>
          <p className="text-white/60 text-sm mb-5">
            {room.role === "host" ? `Calling with ${room.display_name}` : `You're meeting the ${room.display_name}`}
          </p>

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/15 bg-black mb-4">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className={cn("w-full h-full object-cover", (!preflightReady || !camOn) && "opacity-0")}
            />
            {!preflightReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs">
                {preflightLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Requesting camera…</span>
                ) : (
                  <span>Camera preview will appear here</span>
                )}
              </div>
            )}
            {preflightReady && !camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white/60 text-xs">
                Camera off
              </div>
            )}
          </div>

          {preflightReady && (
            <div className="flex items-center justify-center gap-3 mb-5">
              <button
                onClick={togglePreflightMic}
                aria-label={micOn ? "Turn mic off" : "Turn mic on"}
                className={cn(
                  "h-11 w-11 rounded-2xl border flex items-center justify-center transition-colors",
                  micOn
                    ? "bg-white/[0.06] border-white/15 text-white hover:bg-white/[0.12]"
                    : "bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30"
                )}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={togglePreflightCam}
                aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                className={cn(
                  "h-11 w-11 rounded-2xl border flex items-center justify-center transition-colors",
                  camOn
                    ? "bg-white/[0.06] border-white/15 text-white hover:bg-white/[0.12]"
                    : "bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30"
                )}
              >
                {camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          )}

          {isIOSInAppBrowser && (
            <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left">
              <p className="text-amber-200 text-xs font-medium mb-1">⚠️ Open in Safari first</p>
              <p className="text-amber-100/80 text-[12px] leading-relaxed">
                You're in an in-app browser (Gmail, Outlook, Instagram, etc.). iPhone blocks camera/mic here. Tap the ••• or share icon and choose <span className="font-medium">"Open in Safari"</span>, or copy this link and paste it into Safari.
              </p>
              <button
                onClick={() => { void navigator.clipboard?.writeText(fullUrl); }}
                className="mt-3 w-full h-9 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white"
              >
                Copy call link
              </button>
            </div>
          )}

          {!preflightReady ? (
            <Button
              onClick={startPreflight}
              disabled={preflightLoading}
              className="request-shimmer w-full h-12 rounded-2xl bg-white text-black hover:bg-white hover:text-black font-medium"
            >
              {preflightLoading ? "Requesting access…" : "Allow camera & mic"}
            </Button>
          ) : (
            <Button
              onClick={enterWaitingRoom}
              className="request-shimmer w-full h-12 rounded-2xl bg-white text-black hover:bg-white hover:text-black font-medium"
            >
              {room.role === "host" ? "Enter call room" : "Ask to join"}
            </Button>
          )}
          <p className="text-[11px] text-white/40 mt-4">
            You can change mic and camera anytime during the call.
          </p>
        </motion.div>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-center">
        <div className="max-w-sm w-full">
          <p className="text-2xl font-light mb-2">Request declined</p>
          <p className="text-white/60 text-sm mb-6">The host declined your request to join this call.</p>
          <button
            onClick={() => window.close()}
            className="h-11 px-6 rounded-2xl border border-white/20 hover:bg-white/[0.06] text-sm"
          >
            Close tab
          </button>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-center">
        <div className="max-w-sm w-full">
          <p className="text-2xl font-light mb-2">Call ended</p>
          <p className="text-white/60 text-sm mb-6">
            Changed your mind? You can rejoin this call any time — the link stays active.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="request-shimmer h-11 rounded-2xl bg-white text-black hover:bg-white hover:text-black font-medium"
            >
              {room?.role === "host" ? "Restart call" : "Rejoin call"}
            </button>
            <button
              onClick={() => window.close()}
              className="h-11 rounded-2xl border border-white/20 hover:bg-white/[0.06] text-sm"
            >
              Close tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-center">
        <div className="max-w-sm w-full">
          <p className="text-2xl font-light mb-2">Connection failed</p>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            {failMessage || "The call couldn't connect."}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="request-shimmer h-11 rounded-2xl bg-white text-black hover:bg-white hover:text-black font-medium"
            >
              Try again
            </button>
            <button
              onClick={() => window.close()}
              className="h-11 rounded-2xl border border-white/20 hover:bg-white/[0.06] text-sm"
            >
              Close tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  // waiting / calling / connected
  const inWaiting = status === "waiting";
  const remoteCount = isHost ? remotePeers.length : (status === "connected" ? 1 : 0);
  const gridCols = remoteCount <= 1 ? "grid-cols-1" : remoteCount === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ minHeight: "100dvh" }}>
      <SeoHead title="Pixcellor call" description="Live video call." path="/call" noindex />
      {/* Header */}
      <header className="px-5 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-wide">Pixcellor™</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            {status === "connected"
              ? isHost ? `Connected · ${remotePeers.length} guest${remotePeers.length === 1 ? "" : "s"}` : "Connected"
              : status === "calling"
              ? "Connecting…"
              : isHost
              ? pendingGuests.length > 0 ? `${pendingGuests.length} waiting to join` : "Waiting for guests…"
              : "Waiting for host to let you in…"}
          </span>
        </div>
        {recording && (
          <div className="flex items-center gap-2 text-xs text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording
          </div>
        )}
      </header>

      {/* Stage */}
      <div className="relative flex-1 bg-black">
        {/* Guest: single host video */}
        {!isHost && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={cn(
              "absolute inset-0 w-full h-full object-contain",
              (inWaiting || status === "calling") && "opacity-0",
            )}
          />
        )}

        {/* Host: grid of remote guests */}
        {isHost && remotePeers.length > 0 && (
          <div className={cn("absolute inset-0 grid gap-2 p-2", gridCols)}>
            {remotePeers.map(({ peerId, name }) => (
              <div key={peerId} className="relative bg-black/60 rounded-xl overflow-hidden border border-white/10">
                <video
                  ref={(el) => {
                    remoteVideoEls.current.set(peerId, el);
                    const peer = peersRef.current.get(peerId);
                    if (el && peer && el.srcObject !== peer.stream) {
                      el.muted = true;
                      el.srcObject = peer.stream;
                      el.play().catch(() => { /* noop */ });
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                <audio
                  ref={(el) => {
                    remoteAudioEls.current.set(peerId, el);
                    const peer = peersRef.current.get(peerId);
                    if (el && peer && el.srcObject !== peer.stream) {
                      el.srcObject = peer.stream;
                      el.play().catch(() => { /* noop */ });
                    }
                  }}
                  autoPlay
                  className="hidden"
                />
                {(peersRef.current.get(peerId)?.stream.getVideoTracks().length ?? 0) === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/45 text-xs">
                    Connecting video…
                  </div>
                )}
                <span className="absolute left-2 bottom-2 text-[11px] text-white/70 bg-black/50 px-2 py-0.5 rounded">
                  {name}
                </span>
              </div>
            ))}
          </div>
        )}

        {inWaiting && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md w-full rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl p-6 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-2">Waiting room</p>
              {isHost ? (
                <>
                  <h2 className="text-xl font-light mb-1">
                    {pendingGuests.length > 0 ? `${pendingGuests.length} waiting to join` : "Waiting for guests…"}
                  </h2>
                  <p className="text-white/60 text-sm mb-5">
                    Anyone with the guest link can request to join. Approve them below.
                  </p>
                  {pendingGuests.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {pendingGuests.map((g) => (
                        <div key={g.peerId} className="flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserPlus className="w-4 h-4 text-white/60 shrink-0" />
                            <span className="text-sm truncate">{g.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => denyGuest(g.peerId)}
                              className="h-9 w-9 rounded-xl border border-white/15 text-white/70 hover:bg-white/[0.08] flex items-center justify-center"
                              aria-label="Deny"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => admitGuest(g.peerId, g.name)}
                              className="h-9 px-3 rounded-xl bg-white text-black hover:bg-white/90 text-sm font-medium flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4" /> Admit
                            </button>
                          </div>
                        </div>
                      ))}
                      {pendingGuests.length > 1 && (
                        <Button
                          onClick={() => pendingGuests.forEach((g) => admitGuest(g.peerId, g.name))}
                          className="request-shimmer w-full h-11 rounded-2xl bg-white text-black hover:bg-white/90 font-medium"
                        >
                          Admit all
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Anyone you've shared the guest link with will appear here.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-light mb-1">You're in the waiting room</h2>
                  <p className="text-white/60 text-sm mb-4">
                    The host will let you in shortly. Please keep this tab open.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for host to admit you…
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {status === "calling" && !isHost && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm px-6">
            <div className="flex flex-col items-center gap-3 text-center max-w-xs">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting…
              </div>
              {failMessage && (
                <p className="text-[12px] text-white/50 leading-relaxed">{failMessage}</p>
              )}
            </div>
          </div>
        )}

        {/* Host: floating knock toasts for late joiners */}
        {isHost && (status === "calling" || status === "connected") && (
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 max-w-[280px]">
            <AnimatePresence>
              {pendingGuests.map((g) => (
                <motion.div
                  key={g.peerId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl p-3 shadow-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <UserPlus className="w-4 h-4 text-white/70" />
                    <span className="text-sm truncate"><span className="font-medium">{g.name}</span> wants to join</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => denyGuest(g.peerId)}
                      className="flex-1 h-9 rounded-xl border border-white/15 text-white/80 hover:bg-white/[0.08] text-xs"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => admitGuest(g.peerId, g.name)}
                      className="flex-1 h-9 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-medium"
                    >
                      Admit
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Local preview */}
        <div
          className="absolute right-3 md:right-6 w-28 md:w-48 aspect-video rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-black/60 backdrop-blur z-10"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white/60 text-xs">
              Camera off
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        className="px-4 pt-3 flex items-center justify-center gap-2 md:gap-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <CtrlButton onClick={toggleMic} active={micOn} label={micOn ? "Mute" : "Unmute"}>
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </CtrlButton>
        <CtrlButton onClick={toggleCam} active={camOn} label={camOn ? "Camera off" : "Camera on"}>
          {camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </CtrlButton>
        {!inWaiting && (
          <CtrlButton onClick={toggleShare} active={!sharing} highlight={sharing} label={sharing ? "Stop sharing" : "Share screen"}>
            {sharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
          </CtrlButton>
        )}
        {isHost && !inWaiting && (
          <CtrlButton onClick={toggleRecord} active={!recording} highlight={recording} label={recording ? "Stop recording" : "Record"}>
            {recording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </CtrlButton>
        )}
        <button
          onClick={hangup}
          className="ml-1 md:ml-2 h-12 px-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-sm font-medium">{inWaiting ? "Leave" : "End"}</span>
        </button>
      </div>
    </div>
  );
};

const CtrlButton = ({
  children, onClick, active, highlight, label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  highlight?: boolean;
  label: string;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "h-12 w-12 rounded-2xl border flex items-center justify-center transition-colors",
      highlight
        ? "bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30"
        : active
        ? "bg-white/[0.06] border-white/15 text-white hover:bg-white/[0.12]"
        : "bg-white/20 border-white/30 text-white hover:bg-white/30",
    )}
  >
    {children}
  </button>
);

export default CallRoom;
