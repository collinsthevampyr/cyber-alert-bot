import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Image, Trash2, Loader2, Paperclip, Download } from "lucide-react";

interface Props {
  alertId?: string;
  incidentId?: string;
  attachments: any[];
  onRefresh: () => void;
}

export const EvidenceUploader = ({ alertId, incidentId, attachments, onRefresh }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${alertId || incidentId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: metaError } = await supabase.from("evidence_attachments").insert({
        user_id: user.id,
        alert_id: alertId || null,
        incident_id: incidentId || null,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type || "unknown",
        description: description || null,
      });

      if (metaError) throw metaError;

      toast({ title: "Evidence uploaded", description: file.name });
      setDescription("");
      onRefresh();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const deleteAttachment = async (att: any) => {
    await supabase.storage.from("evidence").remove([att.file_path]);
    await supabase.from("evidence_attachments").delete().eq("id", att.id);
    toast({ title: "Evidence removed" });
    onRefresh();
  };

  const downloadAttachment = async (att: any) => {
    const { data } = await supabase.storage.from("evidence").createSignedUrl(att.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const fileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-3 h-3 text-primary" />;
    return <FileText className="w-3 h-3 text-muted-foreground" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Paperclip className="w-3 h-3" /> Evidence ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="text-xs h-7 flex-1"
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept=".png,.jpg,.jpeg,.gif,.pdf,.pcap,.log,.txt,.csv,.json,.zip"
          />
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
            Upload
          </Button>
        </div>

        {attachments.length > 0 && (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 p-1.5 border rounded text-xs">
                  {fileIcon(att.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-foreground">{att.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatSize(att.file_size)} {att.description ? `· ${att.description}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => downloadAttachment(att)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => deleteAttachment(att)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
