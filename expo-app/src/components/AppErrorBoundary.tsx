import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Props = { children: ReactNode };

type State = { error: Error | null };

/** Evita tela branca/crash silencioso no boot — oferece retry. */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Algo deu errado</Text>
        <Text style={styles.copy}>
          O app encontrou um problema ao abrir. Tente novamente — se persistir, feche e abra o app outra vez.
        </Text>
        <Pressable style={styles.btn} onPress={this.retry}>
          <Text style={styles.btnText}>Tentar de novo</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: colors.bg,
    gap: spacing[3],
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  copy: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  btn: {
    marginTop: spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: 12,
    borderRadius: radii.control,
  },
  btnText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#fff',
  },
});
