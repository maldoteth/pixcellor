import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, Video as VideoIcon, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Circle, Square, Loader2 } from "lucide-react";
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
  | { type: "offer"; sdp: RTCSessionDescriptionInit; from: string }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; from: string }
  | { type: "ice"; candidate: RTCIceCandidateInit; from: string }
  | { type: "hello"; from: string; role: "host" | "guest" }
  | { type: "bye"; from: string };

const PEER_ID = crypto.randomUUID();

const CallRoom = () => {
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";

  const [room, setRoom] = useState<Room | null>(null);
  const [iceServers, setIceServers] = useState<RTCIceServer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "calling" | "connected" | "ended">("loading");
  const [remoteJoined, setRemoteJoined] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);

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
        setStatus("ready");
      } catch (e) {
        if (!cancel) setError(String((e as Error)?.message ?? e));
      }
    })();
    return () => { cancel = true; };
  }, [bookingId, token]);

  const sendSignal = useCallback((msg: SignalMessage) => {
    channelRef.current?.send({ type: "broadcast", event: "signal", payload: msg });
  }, []);

  const createPeer = useCallback((): RTCPeerConnection => {
    // Defensive: only keep ICE entries with supported schemes (stun:, turn:, turns:).
    // Any other scheme makes the browser throw "ICE server protocol not supported".
    const safeIce: RTCIceServer[] = [];
    for (const s of iceServers ?? []) {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      const cleaned = urls.filter((u): u is string => typeof u === "string" && /^(stun|turn|turns):/i.test(u));
      if (cleaned.length) safeIce.push({ ...s, urls: cleaned });
    }
    const pc = new RTCPeerConnection({ iceServers: safeIce });
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: "ice", candidate: e.candidate.toJSON(), from: PEER_ID });
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("connected");
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // keep UI; user can hang up
      }
    };
    return pc;
  }, [iceServers, sendSignal]);

  const startNegotiation = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !room) return;
    if (room.role !== "host") return; // host is the offerer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: "offer", sdp: offer, from: PEER_ID });
  }, [room, sendSignal]);

  // 2. Get media + join channel once user clicks Join
  const join = useCallback(async () => {
    if (!room || !iceServers) return;
    setStatus("calling");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const channel = supabase.channel(`call:${room.booking_id}`, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
        const msg = payload as SignalMessage;
        if (msg.from === PEER_ID) return;
        const peer = pcRef.current;
        if (!peer) return;

        if (msg.type === "hello") {
          setRemoteJoined(true);
          // Host kicks off negotiation when guest arrives
          if (room.role === "host") await startNegotiation();
        } else if (msg.type === "offer") {
          await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal({ type: "answer", sdp: answer, from: PEER_ID });
        } else if (msg.type === "answer") {
          await peer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        } else if (msg.type === "ice") {
          try { await peer.addIceCandidate(msg.candidate); } catch (e) { console.warn("ice add failed", e); }
        } else if (msg.type === "bye") {
          setRemoteJoined(false);
        }
      });

      await channel.subscribe(async (s) => {
        if (s === "SUBSCRIBED") {
          sendSignal({ type: "hello", from: PEER_ID, role: room.role });
        }
      });

      channelRef.current = channel;
    } catch (e) {
      const err = e as DOMException;
      const inIframe = window.self !== window.top;
      const ua = navigator.userAgent || "";
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      // iOS in-app browsers (Gmail, Outlook, Instagram, FB, LinkedIn, TikTok, Snapchat) block getUserMedia.
      // Safari UA on iOS contains "Safari/" AND "Version/". WKWebView in-app browsers usually lack "Safari/" or "Version/".
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
      setStatus("ready");
    }
  }, [room, iceServers, createPeer, sendSignal, startNegotiation]);

  const hangup = useCallback(() => {
    sendSignal({ type: "bye", from: PEER_ID });
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current && supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setStatus("ended");
  }, [sendSignal]);

  useEffect(() => () => { hangup(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
  };
  const toggleCam = () => {
    const t = cameraTrackRef.current;
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); }
  };

  const toggleShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;

    if (!sharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];
        await sender.replaceTrack(screenTrack);
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
    const pc = pcRef.current;
    const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
    const camTrack = cameraTrackRef.current;
    if (sender && camTrack) await sender.replaceTrack(camTrack);
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setSharing(false);
  }, []);

  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!localStreamRef.current) return;
    try {
      // Record the local composite (mic + cam). Simpler and reliable than remote recording.
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
              onClick={() => { setError(null); setStatus("ready"); }}
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

  if (status === "ready") {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isIOSInAppBrowser =
      isIOS && (!/Safari\//.test(ua) || !/Version\//.test(ua) ||
        /FBAN|FBAV|Instagram|Line|GSA\/|CriOS|FxiOS|EdgiOS|GMail|Outlook|LinkedInApp|Snapchat|TikTok/i.test(ua));
    const fullUrl = typeof window !== "undefined" ? window.location.href : "";
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <SeoHead title="Join your Pixcellor call" description="Secure browser-based video call with the Pixcellor team." path="/call" noindex />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full rounded-3xl border border-white/15 bg-white/[0.04] backdrop-blur-xl p-8 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-2">Pixcellor</p>
          <h1 className="text-2xl font-light mb-2">Ready to join</h1>
          <p className="text-white/60 text-sm mb-6">
            {room.role === "host" ? `Calling with ${room.display_name}` : `You're meeting the ${room.display_name}`}
          </p>
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
          <Button
            onClick={join}
            className="w-full h-12 rounded-2xl bg-white text-black hover:bg-white/90 font-medium"
          >
            Allow camera & mic and join
          </Button>
          <p className="text-[11px] text-white/40 mt-4">
            Your browser will ask for camera and microphone access.
          </p>
        </motion.div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-2xl font-light mb-2">Call ended</p>
          <p className="text-white/60 text-sm">You can close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <SeoHead title="Pixcellor call" description="Live video call." path="/call" noindex />
      {/* Header */}
      <header className="px-5 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-wide">Pixcellor™</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">
            {status === "connected" ? "Connected" : remoteJoined ? "Connecting…" : "Waiting for other side…"}
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
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            !remoteJoined && "opacity-0",
          )}
        />
        {!remoteJoined && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for {room.role === "host" ? room.display_name : "the Pixcellor team"} to join…
            </div>
          </div>
        )}

        {/* Local preview */}
        <div className="absolute bottom-24 right-4 md:bottom-28 md:right-6 w-32 md:w-48 aspect-video rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-black/60 backdrop-blur">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white/60 text-xs">
              Camera off
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-6 pt-3 flex items-center justify-center gap-2 md:gap-3">
        <CtrlButton onClick={toggleMic} active={micOn} label={micOn ? "Mute" : "Unmute"}>
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </CtrlButton>
        <CtrlButton onClick={toggleCam} active={camOn} label={camOn ? "Camera off" : "Camera on"}>
          {camOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </CtrlButton>
        <CtrlButton onClick={toggleShare} active={!sharing} highlight={sharing} label={sharing ? "Stop sharing" : "Share screen"}>
          {sharing ? <ScreenShareOff className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
        </CtrlButton>
        {room.role === "host" && (
          <CtrlButton onClick={toggleRecord} active={!recording} highlight={recording} label={recording ? "Stop recording" : "Record"}>
            {recording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </CtrlButton>
        )}
        <button
          onClick={hangup}
          className="ml-1 md:ml-2 h-12 px-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-sm font-medium">End</span>
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
