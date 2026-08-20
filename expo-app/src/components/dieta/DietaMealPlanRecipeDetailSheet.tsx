import { useMemo } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { MealPlanRecipe } from '@/lib/meal-plan-api';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = {
  open: boolean;
  recipe: MealPlanRecipe | null;
  onClose: () => void;
};

export default function DietaMealPlanRecipeDetailSheet({ open, recipe, onClose }: Props) {
  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (recipe?.servingsLabel) parts.push(recipe.servingsLabel);
    if (recipe?.prepMinutes) parts.push(`${recipe.prepMinutes} min`);
    return parts.join(' · ');
  }, [recipe]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.head}>
          <View style={styles.headCopy}>
            <Text style={styles.kicker}>Receita</Text>
            <Text style={styles.title}>{recipe?.title || 'Receita'}</Text>
            {metaLine ? <Text style={styles.meta}>{metaLine}</Text> : null}
          </View>
        </View>

        <ScrollView>
          {recipe?.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : null}

          {recipe?.macros?.caloriesKcal ? (
            <View style={styles.macros}>
              <Text style={styles.macroText}>{recipe.macros.caloriesKcal} kcal</Text>
              <Text style={styles.macroText}>C {recipe.macros.carbsG}g</Text>
              <Text style={styles.macroText}>P {recipe.macros.proteinG}g</Text>
              <Text style={styles.macroText}>G {recipe.macros.fatG}g</Text>
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Ingredientes</Text>
            {(recipe?.ingredients || []).map((ingredient) => (
              <Text key={ingredient.id} style={styles.listItem}>
                {ingredient.amount} {ingredient.unit} {ingredient.name}
              </Text>
            ))}
          </View>

          {recipe?.steps ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Modo de preparo</Text>
              <Text style={styles.steps}>{recipe.steps}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderTopLeftRadius: radii.control,
    borderTopRightRadius: radii.control,
    padding: spacing[4],
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3], marginBottom: spacing[3] },
  headCopy: { flex: 1 },
  kicker: { fontFamily: fonts.regular, fontSize: 12, color: '#8a9288' },
  title: { fontFamily: fonts.semibold, fontSize: 19, color: colors.text, marginTop: 2 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: '#6b7368', marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#ecefed',
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', aspectRatio: 16 / 10, borderRadius: radii.control, marginBottom: spacing[3] },
  macros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing[3] },
  macroText: { fontFamily: fonts.medium, fontSize: 12, color: '#15803d' },
  block: { marginBottom: spacing[4] },
  blockTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginBottom: spacing[2] },
  listItem: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 4 },
  steps: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 21 },
});
