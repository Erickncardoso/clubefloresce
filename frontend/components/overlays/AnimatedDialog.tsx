"use client";

import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import motion from "./OverlayMotion.module.scss";
import styles from "./AnimatedDialog.module.scss";
import { joinOverlayClassNames } from "./overlay-utils";

type AnimatedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Título acessível (visível ou via VisuallyHidden) */
  title: string;
  description?: string;
  /** Se true, não renderiza Dialog.Title visível — usa sr-only */
  titleSrOnly?: boolean;
  contentClassName?: string;
  overlayClassName?: string;
  /** Sem estilos default de overlay/content — só motion + classes passadas */
  bare?: boolean;
};

/**
 * Modal central com fade só de opacidade (150ms ease).
 * Use para UI custom; para formulários padrão prefira AppModal.
 *
 * Nunca faça `{open && <div>…}` — o Radix mantém montado
 * com data-state="closed" até o fade-out terminar.
 */
export function AnimatedDialog({
  open,
  onOpenChange,
  children,
  title,
  description,
  titleSrOnly = true,
  contentClassName,
  overlayClassName,
  bare = false,
}: AnimatedDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={joinOverlayClassNames(
            motion.backdrop,
            !bare && styles.overlay,
            overlayClassName,
          )}
        />

        <Dialog.Content
          className={joinOverlayClassNames(
            motion.surface,
            contentClassName,
            // Por último: centralização não pode ser sobrescrita por contentClassName
            !bare && styles.content,
          )}
        >
          <Dialog.Title className={titleSrOnly ? styles.srOnly : undefined}>
            {title}
          </Dialog.Title>

          {description ? (
            <Dialog.Description
              className={titleSrOnly ? styles.srOnly : undefined}
            >
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className={styles.srOnly}>
              {title}
            </Dialog.Description>
          )}

          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
