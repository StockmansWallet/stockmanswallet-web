"use client";

interface StepGrowthProps {
  dailyWeightGain: number;
  mortalityRate: number;
  calvingRate: number;
  isBreeder: boolean;
  onDailyWeightGainChange: (v: number) => void;
  onMortalityRateChange: (v: number) => void;
  onCalvingRateChange: (v: number) => void;
}

function Slider({
  id, label, value, min, max, step, unit, onChange,
}: {
  id: string; label: string; value: number; min: number; max: number;
  step: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">{label}</label>
        <span className="text-sm font-medium text-brand">
          {unit === "kg/day" ? `${value.toFixed(1)} ${unit}` : `${Math.round(value)}${unit}`}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-brand w-full"
      />
      <div className="mt-1 flex justify-between text-xs text-text-muted">
        <span>{min}{unit === "kg/day" ? " kg/day" : unit}</span>
        <span>{max}{unit === "kg/day" ? " kg/day" : unit}</span>
      </div>
    </div>
  );
}

export function StepGrowth({
  dailyWeightGain, mortalityRate, calvingRate, isBreeder,
  onDailyWeightGainChange, onMortalityRateChange, onCalvingRateChange,
}: StepGrowthProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Growth & Mortality</h2>
        <p className="mt-1 text-sm text-text-secondary">Set growth and loss estimates for this herd.</p>
      </div>

      {isBreeder && (
        <Slider
          id="calving_rate"
          label="Estimated Calving Rate"
          value={calvingRate}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={onCalvingRateChange}
        />
      )}

      <Slider
        id="daily_weight_gain"
        label="Average Daily Weight Gain"
        value={dailyWeightGain}
        min={0}
        max={3}
        step={0.1}
        unit="kg/day"
        onChange={onDailyWeightGainChange}
      />

      <Slider
        id="mortality_rate"
        label="Estimated Mortality"
        value={mortalityRate}
        min={0}
        max={30}
        step={1}
        unit="%"
        onChange={onMortalityRateChange}
      />
    </div>
  );
}
