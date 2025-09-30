import ContainerPanel from '../hud/ContainerPanel';
import type GameClient from '../../../../core/gameclient';

interface ContainerWindowProps {
  gc: GameClient;
  containerId: number;
}

export default function ContainerWindow({ gc, containerId }: ContainerWindowProps) {
  return (
    <div className="container-window-content">
      <ContainerPanel gc={gc} containerId={containerId} />
    </div>
  );
}
