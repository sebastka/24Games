// Help › How to Play (the launcher's rules text) and Help › About, as every game has them (the
// originals open their WinHelp file instead; see DECISIONS.md D7).
import type { ReactNode } from 'react';
import codezone from '../assets/shared/codezone.png';
import type { Game } from './catalog.ts';
import { Dialog } from './Dialog.tsx';

/** The rules of the launcher's catalogue, then `controls`: how to play the web version. */
export function RulesDialog(props: { title: string; info: Game; controls: ReactNode; onClose: () => void }) {
  return (
    <Dialog
      title={`How to Play ${props.title}`}
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onClose }]}
    >
      <div className="rules">
        <p>{props.info.blurb}</p>
        {props.info.rules
          .flatMap((r) => r.split('\n\n'))
          .map((r) => (
            <p key={r}>{r}</p>
          ))}
        {typeof props.controls === 'string' ? <p>{props.controls}</p> : props.controls}
      </div>
    </Dialog>
  );
}

/** The copyright lines of the About box; `children` go between them (a game's own credits). */
export function AboutText({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <p>{title} copyright © 1995 by The Code Zone.</p>
      {children}
      <p>
        From 24 Games for Windows 95, © 1995 Expert Software, Inc. "24 Games" is a trademark of Expert Software, Inc.
      </p>
      <p>Reverse-engineered for the browser; this version is not affiliated with either.</p>
    </>
  );
}

/** Help › About: The Code Zone's logo and the copyright lines. */
export function AboutDialog(props: { title: string; onClose: () => void; children?: ReactNode }) {
  return (
    <Dialog
      title={`About ${props.title}`}
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onClose }]}
    >
      <div className="about">
        <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
        <AboutText title={props.title}>{props.children}</AboutText>
      </div>
    </Dialog>
  );
}
