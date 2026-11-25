import { BELT_SWATCH_CLASSES, type BeltRank } from '../types/dojo';

interface BeltSwatchProps {
  rank: BeltRank;
  showKyu?: boolean;
}

export function BeltSwatch({ rank, showKyu = false }: BeltSwatchProps) {
  const cfg = BELT_SWATCH_CLASSES[rank] || BELT_SWATCH_CLASSES.White;
  return (
    <span className="inline-flex items-center gap-2 text-slate-800">
      <span
        aria-hidden="true"
        className={`inline-block w-4 h-2 rounded-[2px] border shrink-0 ${cfg.bg} ${cfg.border}`}
      />
      <span className="whitespace-nowrap">{showKyu ? cfg.label : `${rank} Belt`}</span>
    </span>
  );
}
