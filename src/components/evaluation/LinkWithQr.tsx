import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode as QrIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Props {
  label: string;
  hint?: string;
  value: string;
  /** Nur lesbar? Der öffentliche Anmeldelink wird vergeben, nicht eingegeben. */
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
}

/**
 * Ein Link zum Kopieren, mit ausklappbarem QR-Code.
 *
 * Der QR-Code entsteht im Browser. Vorher lief das über einen fremden Dienst
 * (api.qrserver.com) – der bekam damit jeden Gruppenlink des Vereins zu sehen.
 */
export default function LinkWithQr({
  label, hint, value, readOnly = false, placeholder, onChange, icon,
}: Props) {
  const { toast } = useToast();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!showQr || !canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, { width: 176, margin: 1 }).catch(() => {
      toast({ title: "QR-Code konnte nicht erzeugt werden", variant: "destructive" });
    });
  }, [showQr, value, toast]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyQr = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast({ title: "QR-Code kopiert" });
      } catch {
        // Firefox kann Bilder nicht in die Zwischenablage schreiben.
        toast({
          title: "Kopieren nicht möglich",
          description: "Dieser Browser erlaubt keine Bilder in der Zwischenablage. Nutze stattdessen „Speichern“.",
        });
      }
    });
  };

  const downloadQr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`;
    a.click();
  };

  return (
    <div>
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </Label>
      <div className="flex gap-1.5 mt-1">
        <Input
          value={value}
          readOnly={readOnly || !onChange}
          placeholder={placeholder}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="h-8 text-xs font-mono"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={copyLink}
          disabled={!value}
          aria-label={`${label} kopieren`}
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
        </Button>
        <Button
          variant={showQr ? "secondary" : "outline"}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setShowQr((v) => !v)}
          disabled={!value}
          aria-label={showQr ? "QR-Code ausblenden" : "QR-Code anzeigen"}
          aria-expanded={showQr}
        >
          <QrIcon size={14} />
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}

      {showQr && value && (
        <div className="mt-2 flex flex-col items-center gap-2 rounded-md border bg-muted/30 p-3">
          {/* Weißer Grund: Ein QR-Code auf dunklem Untergrund ist nicht lesbar. */}
          <canvas ref={canvasRef} className="rounded bg-white p-1.5" />
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={copyQr}>
              <Copy size={13} className="mr-1" /> Kopieren
            </Button>
            <Button variant="outline" size="sm" onClick={downloadQr}>
              <Download size={13} className="mr-1" /> Speichern
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
