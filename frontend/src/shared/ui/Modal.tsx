import { X } from 'lucide-react';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from './primitives/Dialog';

/** 呈現具焦點管理的 Radix 對話框；維持現有角色與互動規則。 */ export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={
        /** 同步對話框開關狀態，保留 Radix 焦點管理。 */ (open) => {
          if (!open) onClose();
        }
      }
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent aria-describedby={undefined}>
          <div className="modal-heading">
            <DialogTitle>{title}</DialogTitle>
            <DialogClose asChild>
              <button className="icon-button" aria-label="關閉">
                <X size={20} />
              </button>
            </DialogClose>
          </div>
          {children}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
