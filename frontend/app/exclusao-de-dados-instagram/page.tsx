import type { Metadata } from 'next'
import Link from 'next/link'
import styles from '../ig-legal.module.scss'

export const metadata: Metadata = {
  title: 'Exclusão de dados — Instagram | Clube Florescer',
}

export default function ExclusaoDadosInstagramPage() {
  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <h1>Exclusão de Dados — Automação de Instagram</h1>
        <p className={styles.updated}>Última atualização: 25 de julho de 2026</p>

        <p>
          Se você interagiu com o Instagram do <strong>Clube Florescer</strong> e deseja excluir os
          dados associados à sua conta (identificador, nome de usuário e histórico de interações com
          as automações), siga um dos caminhos abaixo.
        </p>

        <h2>Como solicitar a exclusão</h2>
        <ol>
          <li>
            Envie um e-mail para{' '}
            <a href="mailto:contato@clubeflorescer.com.br">contato@clubeflorescer.com.br</a> com o
            assunto <strong>“Exclusão de dados — Instagram”</strong>, informando o seu nome de
            usuário (@) do Instagram; ou
          </li>
          <li>Envie uma mensagem direta no Instagram do Clube Florescer pedindo a exclusão.</li>
        </ol>

        <h2>O que acontece depois</h2>
        <ul>
          <li>Confirmamos o recebimento do pedido em até 72 horas;</li>
          <li>Excluímos todos os registros associados à sua conta em até 30 dias;</li>
          <li>Você recebe uma confirmação quando a exclusão for concluída.</li>
        </ul>

        <p>
          Detalhes sobre como tratamos seus dados estão na nossa{' '}
          <Link href="/privacidade-instagram">Política de Privacidade</Link>.
        </p>
      </article>
    </main>
  )
}
