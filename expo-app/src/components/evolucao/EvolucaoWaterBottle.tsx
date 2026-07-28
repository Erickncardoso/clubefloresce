import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';
import EvolucaoWaterVesselIcon from '@/components/evolucao/EvolucaoWaterVesselIcon';
import { loadWaterVesselSettings } from '@/lib/water-vessel-settings';
import { fonts } from '@/theme/tokens';

type WaterBottleProps = {
  current: number;
  target: number;
  onIncrement: (amountLiters: number) => void;
  onDecrement: (amountLiters: number) => void;
  readonly?: boolean;
};

type VesselKind = 'glass' | 'bottle';

function formatLiters(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(rounded)} L`;
}

function formatMilliliters(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(value * 1000))} ml`;
}

export default function EvolucaoWaterBottle({
  current,
  target,
  onIncrement,
  onDecrement,
  readonly = false,
}: WaterBottleProps) {
  const [glassMl, setGlassMl] = useState(250);
  const [bottleMl, setBottleMl] = useState(500);
  const [selectedVessel, setSelectedVessel] = useState<VesselKind>('glass');

  useEffect(() => {
    void loadWaterVesselSettings().then((settings) => {
      setGlassMl(settings.glassMl);
      setBottleMl(settings.bottleMl);
    });
  }, []);

  const vesselOptions = useMemo(
    () => [
      { id: 'glass' as const, label: 'Copo', amount: glassMl / 1000 },
      { id: 'bottle' as const, label: 'Garrafa', amount: bottleMl / 1000 },
    ],
    [bottleMl, glassMl],
  );

  const selectedOption = vesselOptions.find((option) => option.id === selectedVessel) || vesselOptions[0];
  const fillPercent = target ? Math.min(100, (current / target) * 100) : 0;

  function handleIncrement() {
    onIncrement(selectedOption.amount);
  }

  function handleDecrement() {
    onDecrement(selectedOption.amount);
  }

  return (
    <View style={styles.root}>
      {!readonly ? (
        <View style={styles.picker}>
          <Text style={styles.pickerLabel}>Escolha o recipiente</Text>
          <View style={styles.options}>
            {vesselOptions.map((option) => {
              const active = selectedVessel === option.id;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => setSelectedVessel(option.id)}
                >
                  <View style={styles.optionIcon}>
                    <EvolucaoWaterVesselIcon kind={option.id} fillPercent={72} width={24} height={34} />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{option.label}</Text>
                    <Text style={styles.optionSub}>{formatMilliliters(option.amount)}</Text>
                  </View>
                  <View style={[styles.optionCheck, active && styles.optionCheckActive]}>
                    {active ? <Check color="#fff" size={10} strokeWidth={2.5} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.summary}>
        <View style={styles.visual}>
          <EvolucaoWaterVesselIcon
            kind={selectedOption.id}
            fillPercent={fillPercent}
            width={56}
            height={86}
          />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryLabel}>
            {readonly ? 'Consumo registrado' : 'Próximo registro'}
          </Text>
          <Text style={styles.summaryValue}>
            {readonly ? formatLiters(current) : formatMilliliters(selectedOption.amount)}
          </Text>
          <Text style={styles.summaryMeta}>
            {formatLiters(current)} de {formatLiters(target)}
          </Text>
        </View>
      </View>

      {!readonly ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.undoBtn, current <= 0 && styles.undoBtnDisabled]}
            disabled={current <= 0}
            onPress={handleDecrement}
          >
            <Minus color="#5f5f65" size={14} strokeWidth={2} />
            <Text style={styles.undoText}>Remover</Text>
          </Pressable>
          <Pressable style={styles.addBtn} onPress={handleIncrement}>
            <Plus color="#fff" size={14} strokeWidth={2} />
            <Text style={styles.addText}>Adicionar {formatMilliliters(selectedOption.amount)}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  picker: { gap: 7 },
  pickerLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#737378',
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 52,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#e2e2e7',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  optionActive: {
    borderColor: '#7bb7dc',
    backgroundColor: '#f1f8fc',
  },
  optionIcon: { width: 24, height: 34, flexShrink: 0 },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#202124',
  },
  optionSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#7f7f85',
    fontVariant: ['tabular-nums'],
  },
  optionCheck: {
    width: 16,
    height: 16,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: '#d9d9de',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionCheckActive: {
    borderColor: '#5ba4d9',
    backgroundColor: '#5ba4d9',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: '#f8fafb',
  },
  visual: { width: 56, height: 86, flexShrink: 0 },
  summaryCopy: { minWidth: 120 },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#7f7f85',
  },
  summaryValue: {
    marginTop: 3,
    fontFamily: fonts.medium,
    fontSize: 21,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    color: '#202124',
  },
  summaryMeta: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#737378',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  undoBtn: {
    flex: 0.72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dedee3',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  undoBtnDisabled: { opacity: 0.45 },
  undoText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#5f5f65',
  },
  addBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#5ba4d9',
    borderRadius: 12,
    backgroundColor: '#5ba4d9',
  },
  addText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#fff',
  },
});
