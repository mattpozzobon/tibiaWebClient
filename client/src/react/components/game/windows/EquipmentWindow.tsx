import EquipmentPanel from '../hud/EquipmentPanel';
import type GameClient from '../../../../core/gameclient';

interface EquipmentWindowProps {
  gc: GameClient;
  containerIndex: number;
}

export default function EquipmentWindow({ gc, containerIndex }: EquipmentWindowProps) {
  return (
    <div className="equipment-window-content">
      <EquipmentPanel gc={gc} containerIndex={containerIndex} />
    </div>
  );
}
