import { useEffect, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Icon } from '@/ui/Icon';
import { useEditable } from '@/editor/useEditable';
import { formatBytes, LARGE_FILE_WARNING_BYTES, resolveAttachmentUrl, storeAttachment } from '@/editor/attachment/files';

export function AttachmentView({ node, editor, updateAttributes, deleteNode }: NodeViewProps) {
  const editable = useEditable(editor);
  const fileId = node.attrs.fileId as string | null;
  const name = (node.attrs.name as string | null) ?? 'Datei';
  const mimeType = (node.attrs.mimeType as string | null) ?? '';
  const size = node.attrs.size as number | null;

  const [url, setUrl] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!fileId) return;
    let cancelled = false;
    void resolveAttachmentUrl(fileId).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  async function handleFile(file: File) {
    setBusy(true);
    setWarning(file.size > LARGE_FILE_WARNING_BYTES ? 'Große Datei – kann die Ladezeit dieser Notiz beeinträchtigen.' : null);
    try {
      const stored = await storeAttachment(file);
      updateAttributes({ fileId: stored.fileId, name: stored.name, mimeType: stored.mimeType, size: stored.size });
    } finally {
      setBusy(false);
    }
  }

  function pickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void handleFile(file);
    };
    input.click();
  }

  if (!fileId) {
    if (!editable) {
      return (
        <NodeViewWrapper className="b-attach-ph is-readonly" contentEditable={false}>
          <Icon name="file" /> Kein Anhang
        </NodeViewWrapper>
      );
    }
    return (
      <NodeViewWrapper contentEditable={false}>
        <div
          className={`b-attach-ph${over ? ' is-over' : ''}`}
          onDragOver={(e) => {
            if (![...e.dataTransfer.types].includes('Files')) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
        >
          <Icon name="file" className="b-attach-ph-icon" />
          <div className="b-attach-ph-main">
            <button type="button" className="b-btn b-btn-primary" disabled={busy} onClick={pickFile}>
              <Icon name="upload" /> {busy ? 'Wird hochgeladen …' : 'Datei wählen'}
            </button>
            <p className="b-attach-ph-hint">Oder eine Datei hierher ziehen.</p>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="b-attach" contentEditable={false}>
      <Icon name="file" className="b-attach-icon" />
      <div className="b-attach-info">
        <span className="b-attach-name">{name}</span>
        <span className="b-attach-meta">
          {size != null && formatBytes(size)}
          {mimeType && ` · ${mimeType}`}
        </span>
        {warning && <span className="b-attach-warning">{warning}</span>}
      </div>
      <div className="b-attach-actions">
        {url && (
          <a className="b-attach-btn" href={url} download={name} title="Herunterladen">
            <Icon name="download" />
          </a>
        )}
        {editable && (
          <button type="button" className="b-attach-btn is-danger" title="Entfernen" onClick={() => deleteNode()}>
            <Icon name="trash" />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
}
