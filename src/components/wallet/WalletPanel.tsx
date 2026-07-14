import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Wallet as WalletIcon, Send, QrCode, Eye, Copy, RefreshCw, Landmark, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getEthBalance, getSolBalance, getGbpPrices, type GbpPrices } from "@/lib/wallet/rpc";
import { CreateWalletDialog } from "./CreateWalletDialog";
import { ReceiveDialog } from "./ReceiveDialog";
import { SendDialog } from "./SendDialog";
import { RevealKeysDialog } from "./RevealKeysDialog";
import { CashOutDialog } from "./CashOutDialog";
import { RecoverWalletDialog } from "./RecoverWalletDialog";
import { AddPasskeyDialog } from "./AddPasskeyDialog";
import { hasPasskey } from "@/lib/wallet/passkeyStore";
import { isPasskeySupported } from "@/lib/wallet/webauthn";

interface WalletRow {
  user_id: string;
  eth_address: string;
  sol_address: string;
  encrypted_seed: string;
  salt: string;
  iv: string;
  kdf_iterations: number;
}

interface WalletPanelProps {
  userId: string;
}

const shorten = (addr: string) => (addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr);

export function WalletPanel({ userId }: WalletPanelProps) {
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [solBalance, setSolBalance] = useState<string>("0");
  const [prices, setPrices] = useState<GbpPrices>({ eth: 0, sol: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState<"ETH" | "SOL" | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [addPasskeyOpen, setAddPasskeyOpen] = useState(false);
  const [pkEnrolled, setPkEnrolled] = useState(false);

  const refreshPasskeyState = useCallback(async () => {
    setPkEnrolled(await hasPasskey(userId));
  }, [userId]);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_wallets")
      .select("user_id, eth_address, sol_address, encrypted_seed, salt, iv, kdf_iterations")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      toast.error("Failed to load wallet");
    }
    setWallet(data as WalletRow | null);
    if (data) void refreshPasskeyState();
    setLoading(false);
  }, [userId, refreshPasskeyState]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const refreshBalances = useCallback(async () => {
    if (!wallet) return;
    setRefreshing(true);
    const [eth, sol, px] = await Promise.all([
      getEthBalance(wallet.eth_address),
      getSolBalance(wallet.sol_address),
      getGbpPrices(),
    ]);
    setEthBalance(eth);
    setSolBalance(sol);
    setPrices(px);
    setRefreshing(false);
  }, [wallet]);

  useEffect(() => {
    if (wallet) void refreshBalances();
  }, [wallet, refreshBalances]);

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const encrypted: EncryptedPayload | null = wallet
    ? {
        ciphertext: wallet.encrypted_seed,
        salt: wallet.salt,
        iv: wallet.iv,
        iterations: wallet.kdf_iterations,
      }
    : null;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading wallet…</CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5" /> Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You don't have a wallet yet. Create one to send and receive Ethereum and Solana. Your keys are encrypted in this
            browser and never leave it in plaintext.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <WalletIcon className="w-4 h-4 mr-2" /> Create wallet
          </Button>
        </CardContent>
        <CreateWalletDialog open={createOpen} onOpenChange={setCreateOpen} userId={userId} onCreated={loadWallet} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5" /> Wallet
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={refreshBalances} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-card/40 p-4">
            <p className="text-xs text-muted-foreground">Total balance</p>
            <p className="text-2xl font-semibold">
              £{(Number(ethBalance) * prices.eth + Number(solBalance) * prices.sol).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-sm font-normal text-muted-foreground">GBP</span>
            </p>
          </div>
          <ChainRow
            label="Ethereum"
            symbol="ETH"
            address={wallet.eth_address}
            balance={ethBalance}
            gbpValue={Number(ethBalance) * prices.eth}
            onCopy={() => copy(wallet.eth_address, "Address")}
            onReceive={() => setReceiveOpen("ETH")}
          />
          <ChainRow
            label="Solana"
            symbol="SOL"
            address={wallet.sol_address}
            balance={solBalance}
            gbpValue={Number(solBalance) * prices.sol}
            onCopy={() => copy(wallet.sol_address, "Address")}
            onReceive={() => setReceiveOpen("SOL")}
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => setSendOpen(true)}>
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
            <Button variant="secondary" onClick={() => setCashOutOpen(true)}>
              <Landmark className="w-4 h-4 mr-2" /> Cash out
            </Button>
            <Button variant="outline" onClick={() => setRevealOpen(true)}>
              <Eye className="w-4 h-4 mr-2" /> Reveal keys
            </Button>
          </div>
          {isPasskeySupported() && (
            <div className="flex items-center justify-between rounded-md border bg-card/40 p-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className={`w-4 h-4 ${pkEnrolled ? "text-green-500" : "text-muted-foreground"}`} />
                <span>
                  {pkEnrolled
                    ? "Passkey protection is on"
                    : "Add a passkey so a leaked backup can't be brute-forced"}
                </span>
              </div>
              <Button size="sm" variant={pkEnrolled ? "outline" : "secondary"} onClick={() => setAddPasskeyOpen(true)}>
                {pkEnrolled ? "Add device" : "Protect with passkey"}
              </Button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setRecoverOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Forgot wallet password?
          </button>
        </CardContent>
      </Card>


      {encrypted && (
        <>
          <SendDialog
            open={sendOpen}
            onOpenChange={setSendOpen}
            userId={userId}
            encrypted={encrypted}
            ethAddress={wallet.eth_address}
            solAddress={wallet.sol_address}
            onSent={refreshBalances}
          />
          <RevealKeysDialog
            open={revealOpen}
            onOpenChange={setRevealOpen}
            userId={userId}
            encrypted={encrypted}
          />
          <AddPasskeyDialog
            open={addPasskeyOpen}
            onOpenChange={setAddPasskeyOpen}
            userId={userId}
            encrypted={encrypted}
            onAdded={refreshPasskeyState}
          />
        </>
      )}
      <ReceiveDialog
        open={receiveOpen !== null}
        onOpenChange={(o) => !o && setReceiveOpen(null)}
        chain={receiveOpen ?? "ETH"}
        address={receiveOpen === "SOL" ? wallet.sol_address : wallet.eth_address}
      />
      <CashOutDialog
        open={cashOutOpen}
        onOpenChange={setCashOutOpen}
        userId={userId}
        ethBalance={ethBalance}
        solBalance={solBalance}
        ethGbp={prices.eth}
        solGbp={prices.sol}
      />
      <RecoverWalletDialog
        open={recoverOpen}
        onOpenChange={setRecoverOpen}
        userId={userId}
        onRecovered={loadWallet}
      />
    </div>
  );
}

interface ChainRowProps {
  label: string;
  symbol: string;
  address: string;
  balance: string;
  gbpValue: number;
  onCopy: () => void;
  onReceive: () => void;
}

function ChainRow({ label, symbol, address, balance, gbpValue, onCopy, onReceive }: ChainRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{shorten(address)}</p>
        <p className="text-sm mt-1">
          {Number(balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} {symbol}
        </p>
        <p className="text-xs text-muted-foreground">
          ≈ £{gbpValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GBP
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onCopy}>
          <Copy className="w-4 h-4 mr-1" /> Copy
        </Button>
        <Button size="sm" variant="outline" onClick={onReceive}>
          <QrCode className="w-4 h-4 mr-1" /> Receive
        </Button>
      </div>
    </div>
  );
}
