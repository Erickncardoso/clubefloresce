"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import motion from "./OverlayMotion.module.scss";
import styles from "./AppModal.module.scss";
import { joinOverlayClassNames } from "./overlay-utils";

type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
  showClose?: boolean;
};

/**
 * Modal central padrão do admin.
 * Animação: apenas opacity 150ms ease (OverlayMotion) — sem scale/translateY.
 */
export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  contentClassName,
  showClose = true,
}: AppModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={joinOverlayClassNames(motion.backdrop, styles.overlay)}
        />

        <Dialog.Content
          className={joinOverlayClassNames(
            motion.surface,
            contentClassName,
            styles.content,
          )}
        >
          <header className={styles.header}>
            <Dialog.Title className={styles.title}>{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className={styles.description}>
                {description}
              </Dialog.Description>
            ) : (
              <Dialog.Description className={styles.srOnly}>
                {title}
              </Dialog.Description>
            )}
          </header>

          <div className={styles.body}>{children}</div>

          {showClose ? (
            <Dialog.Close className={styles.close} aria-label="Fechar modal">
              <X size={18} aria-hidden />
            </Dialog.Close>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
