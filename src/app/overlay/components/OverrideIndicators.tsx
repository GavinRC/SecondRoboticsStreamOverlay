interface OverrideIndicatorsProps {
  isRed: boolean | undefined;
  awp: boolean;
  autoBonus: number; // Value from Auto_bonus_*.txt (0 = not earned)
  align: 'left' | 'right';
}

export default function OverrideIndicators({ isRed, awp, autoBonus, align }: OverrideIndicatorsProps) {
  const activeBg = isRed ? 'bg-red-500/80' : 'bg-blue-500/80';
  const inactiveBg = 'bg-gray-700/50';

  const badges = [
    { label: 'AWP',  name: 'Auto Win Point', sub: 'Win Pt', active: awp },
    // Show the point value if the file holds one, otherwise just "Bonus"
    { label: 'AUTO', name: 'Autonomous Bonus', sub: autoBonus > 1 ? `+${autoBonus}` : 'Bonus', active: autoBonus > 0 },
  ];

  return (
    <div className={`flex gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {badges.map(b => (
        <div
          key={b.name}
          title={b.name}
          className={`flex flex-col items-center px-3 py-1 rounded text-xs font-bold transition-all duration-300 ${
            b.active ? activeBg + ' text-white' : inactiveBg + ' text-gray-500'
          }`}
        >
          <span>{b.label}</span>
          <span className="text-[10px] leading-tight">{b.sub}</span>
        </div>
      ))}
    </div>
  );
}
