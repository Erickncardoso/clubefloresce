import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Clock3, type LucideIcon } from 'lucide-react-native';
import CameraIcon from '@/components/icons/CameraIcon';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export type DietaAllMealRow = {
  id: string;
  label: string;
  time?: string;
  icon: LucideIcon;
  progressLabel: string;
  percent: number;
  complete: boolean;
  hasPhoto: boolean;
};

type Props = {
  meals: DietaAllMealRow[];
  completedCount: number;
  onOpenMeal: (mealId: string) => void;
  onTakePhoto: (meal: { id: string; label: string }) => void;
};

export default function DietaAllMealsList({
  meals,
  completedCount,
  onOpenMeal,
  onTakePhoto,
}: Props) {
  return (
    <View>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Todas as refeições</Text>
          <Text style={styles.hint}>Toque para abrir. Câmera envia a foto do prato.</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{completedCount}/{meals.length}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {meals.map((meal) => {
          const Icon = meal.icon;
          return (
            <View key={meal.id} style={[styles.card, meal.complete && styles.cardDone]}>
              <Pressable style={styles.body} onPress={() => onOpenMeal(meal.id)}>
                <View style={[styles.icon, meal.complete && styles.iconDone]}>
                  <Icon size={18} color={meal.complete ? colors.primaryDark : '#6f7863'} strokeWidth={1.85} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name} numberOfLines={1}>{meal.label}</Text>
                  <View style={styles.meta}>
                    {meal.time ? (
                      <View style={styles.timeRow}>
                        <Clock3 size={12} color={colors.textMuted} strokeWidth={2} />
                        <Text style={styles.metaText}>{meal.time}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={[styles.metaText, meal.complete && styles.metaDone]}>
                      {meal.progressLabel}
                    </Text>
                    {meal.hasPhoto ? (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.metaDone}>Foto ok</Text>
                      </>
                    ) : null}
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${meal.percent}%` }]} />
                  </View>
                </View>
              </Pressable>

              <Pressable
                style={[styles.photoBtn, meal.hasPhoto && styles.photoBtnDone]}
                onPress={() => onTakePhoto({ id: meal.id, label: meal.label })}
                accessibilityLabel={meal.hasPhoto ? 'Trocar foto' : 'Tirar foto'}
              >
                {meal.hasPhoto
                  ? <Check size={16} color={colors.primaryDark} strokeWidth={2.4} />
                  : <CameraIcon size={16} color="#fff" />}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  hint: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    maxWidth: 220,
  },
  countPill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primaryDark },
  list: { gap: spacing[2] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  cardDone: {
    borderColor: '#d7e0d1',
    backgroundColor: '#f7f9f5',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minWidth: 0,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDone: { backgroundColor: '#e4ecde' },
  copy: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  metaDone: { color: colors.primaryDark, fontFamily: fonts.medium },
  metaDot: { color: colors.textMuted, fontSize: 12 },
  track: {
    height: 3,
    borderRadius: 99,
    backgroundColor: colors.track,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
  photoBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnDone: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
