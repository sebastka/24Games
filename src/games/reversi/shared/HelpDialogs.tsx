// Help › How to Play (the launcher's rules text) and Help › About, as Bulldozer has them.
import codezone from '../../../assets/shared/codezone.png';
import type { Game } from '../../../shell/catalog.ts';
import { Dialog } from '../../../shell/Dialog.tsx';

export function RulesDialog(props: { title: string; info: Game; controls: string; onClose: () => void }) {
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
        <p>{props.controls}</p>
      </div>
    </Dialog>
  );
}

export function AboutDialog(props: { title: string; onClose: () => void }) {
  return (
    <Dialog
      title={`About ${props.title}`}
      buttons={[{ label: 'OK', primary: true, cancel: true, onClick: props.onClose }]}
    >
      <div className="about">
        <img src={codezone} alt="The Code Zone: Sweet Software for a Saturnine World" width={321} height={149} />
        <p>{props.title} copyright © 1995 by The Code Zone.</p>
        <p>
          From 24 Games for Windows 95, © 1995 Expert Software, Inc. "24 Games" is a trademark of Expert Software, Inc.
        </p>
        <p>Reverse-engineered for the browser; this version is not affiliated with either.</p>
      </div>
    </Dialog>
  );
}
