import { useEffect, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import CheckinTypeformFlow, { type CheckinFlowStep } from '@/components/checkin/CheckinTypeformFlow';

import PatientHeader from '@/components/ui/PatientHeader';

import PatientShell from '@/components/PatientShell';

import LoadingScreen from '@/components/ui/LoadingScreen';

import { useWeeklyCheckIn } from '@/hooks/useWeeklyCheckIn';

import { usePatientApi } from '@/hooks/usePatientApi';

import { onCheckinCompleted } from '@/notifications/sync-engine';

import { colors, fonts, radii, spacing } from '@/theme/tokens';



type Template = {

  id: string;

  title: string;

  description?: string;

  frequency?: string;

  completedThisPeriod?: boolean;

  steps?: CheckinFlowStep[];

};



function frequencyLabel(freq?: string) {

  if (freq === 'daily') return 'Diário';

  if (freq === 'monthly') return 'Mensal';

  return 'Semanal';

}



export default function CheckInScreen() {

  const router = useRouter();

  const params = useLocalSearchParams<{ template?: string }>();

  const { request } = usePatientApi();

  const {

    templates,

    loading,

    waitMessage,

    canOpenTemplate,

    loadCheckInAccess,

  } = useWeeklyCheckIn();

  const [selected, setSelected] = useState<Template | null>(null);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const [submitted, setSubmitted] = useState(false);



  useEffect(() => {

    loadCheckInAccess();

  }, [loadCheckInAccess]);



  useEffect(() => {

    const templateId = typeof params.template === 'string' ? params.template : '';

    if (!templateId || !templates.length || selected) return;

    const tpl = templates.find((item) => item.id === templateId);

    if (tpl && canOpenTemplate(tpl)) {

      setSelected(tpl as Template);

      setSubmitted(false);

      setError('');

    }

  }, [canOpenTemplate, params.template, selected, templates]);



  async function submitAnswers(answers: Record<string, unknown>) {

    if (!selected || submitted) return;

    setSaving(true);

    setError('');

    try {

      await request('/checkin/responses', {

        method: 'POST',

        body: JSON.stringify({

          templateId: selected.id,

          answers,

        }),

      });

      setSubmitted(true);
      await onCheckinCompleted();

      setTimeout(() => router.replace('/check-in/concluido' as never), 1200);

    } catch (err) {

      setError((err as Error).message);

    } finally {

      setSaving(false);

    }

  }



  if (loading) {

    return (

      <PatientShell>

        <PatientHeader title="Check-ins" showBack backTo="/inicio" showBell={false} showMenu={false} />

        <LoadingScreen />

      </PatientShell>

    );

  }



  if (selected) {
    return (
      <PatientShell>
        <View style={{ flex: 1 }}>
          <CheckinTypeformFlow
            steps={selected.steps || []}
            saving={saving}
            submitted={submitted}
            error={error}
            showHistoryLink
            onSubmit={submitAnswers}
          />
        </View>
      </PatientShell>
    );
  }



  return (

    <PatientShell>

      <PatientHeader title="Check-ins" showBack backTo="/inicio" showBell={false} showMenu={false} />

      <ScrollView contentContainerStyle={styles.list}>

        {!templates.length ? (

          <Text style={styles.empty}>Nenhum check-in disponível no momento.</Text>

        ) : null}

        {templates.map((tpl) => {

          const open = canOpenTemplate(tpl);

          return (

            <Pressable

              key={tpl.id}

              style={[styles.card, tpl.completedThisPeriod && styles.cardDone, !open && styles.cardLocked]}

              disabled={!open}

              onPress={() => {

                setSelected(tpl as Template);

                setSubmitted(false);

                setError('');

              }}

            >

              <Text style={styles.cardTitle}>{tpl.title}</Text>

              {tpl.description ? <Text style={styles.cardDesc}>{tpl.description}</Text> : null}

              <Text style={styles.cardMeta}>{frequencyLabel(tpl.frequency)}</Text>

              {tpl.completedThisPeriod ? (

                <Text style={styles.badge}>Respondido</Text>

              ) : null}

            </Pressable>

          );

        })}

        {waitMessage ? <Text style={styles.waitMessage}>{waitMessage}</Text> : null}

      </ScrollView>

    </PatientShell>

  );

}



const styles = StyleSheet.create({

  list: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },

  card: {

    borderRadius: radii.control,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: colors.surface,

    padding: spacing[4],

    gap: spacing[2],

  },

  cardDone: { opacity: 0.7 },

  cardLocked: { opacity: 0.5 },

  cardTitle: { fontFamily: fonts.bold, fontSize: 16 },

  cardDesc: { fontFamily: fonts.regular, color: colors.textMuted },

  cardMeta: { fontFamily: fonts.semibold, color: colors.primaryDark, fontSize: 12 },

  badge: {

    alignSelf: 'flex-start',

    backgroundColor: colors.primarySoft,

    fontFamily: fonts.semibold,

    fontSize: 11,

    paddingHorizontal: 8,

    paddingVertical: 4,

    borderRadius: radii.pill,

  },

  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },

  waitMessage: {

    marginTop: spacing[2],

    padding: spacing[3],

    borderRadius: radii.control,

    borderWidth: 1,

    borderColor: colors.border,

    backgroundColor: '#fafafa',

    fontFamily: fonts.regular,

    fontSize: 13,

    lineHeight: 19,

    color: colors.textMuted,

    textAlign: 'center',

  },

});

