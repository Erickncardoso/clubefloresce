import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ArrowUp } from 'lucide-react-native';
import PatientHeader from '@/components/ui/PatientHeader';
import PatientShell from '@/components/PatientShell';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { BELLA_TOPIC_TITLES } from '@/lib/bella-actions';
import { getApiBase } from '@/config/env';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function BellaChatScreen() {
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const chatTopic = String(topic || 'general');
  const meta = BELLA_TOPIC_TITLES[chatTopic] || BELLA_TOPIC_TITLES.general;
  const { request, token } = usePatientApi();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await request<{ messages?: ChatMessage[] }>(
        `/bella/messages?topic=${encodeURIComponent(chatTopic)}`,
      );
      const history = data.messages || [];
      if (!history.length) {
        setMessages([{
          id: `welcome-${chatTopic}`,
          role: 'assistant',
          content: 'Oi! Sou a Bella. Como posso te ajudar hoje?',
        }]);
      } else {
        setMessages(history);
      }
    } catch (err) {
      setError((err as Error).message);
      setMessages([{
        id: `welcome-${chatTopic}`,
        role: 'assistant',
        content: 'Oi! Sou a Bella. Como posso te ajudar hoje?',
      }]);
    } finally {
      setLoading(false);
    }
  }, [chatTopic, request]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || sending) return;

    const tempId = `temp-${Date.now()}`;
    setDraft('');
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: text }]);
    setSending(true);
    setError('');

    try {
      const form = new FormData();
      form.append('topic', chatTopic);
      form.append('message', text);

      const url = `${getApiBase()}/bella/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CF-Client': 'expo',
        },
        body: form,
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || 'Não foi possível falar com a Bella.');
      }

      const reply = body?.reply || body?.message?.content || body?.content || 'Pronto! Analisei sua mensagem.';
      setMessages((prev) => [
        ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: String(reply) },
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <PatientShell withTabClearance={false}>
      <PatientHeader
        title={meta.title}
        subtitle={meta.subtitle}
        showBack
        backTo="/bella"
        showBell={false}
        showMenu={false}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {loading ? (
          <LoadingScreen />
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.bubbleWrap,
                  msg.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapBot,
                ]}
              >
                <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.placeholder}
            multiline
            editable={!sending}
          />
          <Pressable
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!draft.trim() || sending}
          >
            <ArrowUp color="#fff" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messages: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[6] },
  bubbleWrap: { flexDirection: 'row' },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapBot: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    borderRadius: radii.control,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  bubbleUser: { backgroundColor: colors.primary },
  bubbleBot: { backgroundColor: '#f3f4f6' },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  bubbleTextUser: { color: '#fff' },
  error: { color: colors.error, fontFamily: fonts.medium, textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    padding: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
