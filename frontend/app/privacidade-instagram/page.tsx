import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../ig-legal.module.scss'

export const metadata: Metadata = {
  title: 'Privacidade — Instagram | Clube Florescer',
}

export default function PrivacidadeInstagramPage() {
  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <h1>Política de Privacidade — Automação de Instagram</h1>
        <p className={styles.updated}>Última atualização: 25 de julho de 2026</p>

        <p>
          Esta política descreve como o <strong>Clube Florescer</strong> trata os dados recebidos
          por meio da integração com a plataforma Instagram (Meta) usada para responder
          automaticamente comentários, respostas de story e mensagens diretas.
        </p>

        <h2>Quais dados coletamos</h2>
        <ul>
          <li>
            Identificador da sua conta no Instagram no escopo deste aplicativo (IGSID) e nome de
            usuário público;
          </li>
          <li>Conteúdo de comentários e mensagens que contenham as palavras-chave configuradas;</li>
          <li>Data e hora das interações.</li>
        </ul>

        <h2>Para que usamos</h2>
        <ul>
          <li>Enviar a resposta automática solicitada por você (por exemplo, um link de material);</li>
          <li>Evitar envios duplicados para a mesma interação;</li>
          <li>Registrar o histórico mínimo necessário ao funcionamento do serviço.</li>
        </ul>

        <h2>O que não fazemos</h2>
        <ul>
          <li>Não vendemos nem compartilhamos seus dados com terceiros;</li>
          <li>Não enviamos mensagens em massa não solicitadas;</li>
          <li>
            Não armazenamos sua senha do Instagram — a conexão é feita pelo login oficial da Meta.
          </li>
        </ul>

        <h2>Armazenamento e segurança</h2>
        <p>
          Os dados ficam em banco de dados privado, acessível apenas pelo servidor do Clube Florescer,
          e são mantidos somente pelo tempo necessário ao funcionamento da automação.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Você pode solicitar a exclusão dos seus dados a qualquer momento. Veja como em{' '}
          <Link href="/exclusao-de-dados-instagram">Exclusão de dados</Link> ou escreva para{' '}
          <a href="mailto:contato@clubeflorescer.com.br">contato@clubeflorescer.com.br</a>.
        </p>
      </article>
    </main>
  )
}
