# 🎰 Sistema de Verificação Automática de Depósitos - Raspabet

## ⚠️ ALERTA DE SISTEMA
Identificamos que alguns depósitos estão demorando a ser processados devido a erros de comunicação com a PlinqPay.

### **Erros Identificados:**
1. **Polling (403 Forbidden):** A Edge Function está recebendo acesso negado ao consultar a PlinqPay. Isso geralmente indica que a **PLINQPAY_API_KEY** configurada no Supabase expirou ou está incorreta.
2. **Webhook (Assinatura Inválida):** O sistema de segurança do Webhook está rejeitando as notificações da PlinqPay. Isso acontece se a **PLINQPAY_SECRET_KEY** estiver incorreta.

---

## ✅ SOLUÇÃO TEMPORÁRIA: Aprovação Manual
Adicionamos uma nova funcionalidade no **Painel Admin** para você não deixar seus jogadores esperando:

1. Acesse o **Painel Admin** (`/#admin`).
2. Vá na aba **Depósitos**.
3. Localize o depósito pendente.
4. Clique no botão Verde ✅ (**Aprovar Manualmente**) após confirmar que o dinheiro caiu na sua conta Plinq.
5. O saldo será creditado instantaneamente na conta do jogador.

---

## 🔄 Como Funciona o Sistema Automático

### **Fluxo de Verificação:**
1. **Sistema verifica automaticamente (a cada 15s)**
   - Consulta API da PlinqPay via Edge Function.
   - Se encontrar status `PAID`, credita o saldo.

---

## 🛠️ Como Corrigir o Automático

Para que o sistema volte a creditar sozinho, siga estes passos no **Dashboard do Supabase**:

1. Vá em **Edge Functions**.
2. Clique em **Manage Secrets** (ou similar).
3. Verifique/Atualize as seguintes chaves:
   - `PLINQPAY_API_KEY`: Deve começar com `pk_`.
   - `PLINQPAY_SECRET_KEY`: Deve começar com `sk_`.
4. Salve as alterações.

---

## 📊 Diagnóstico Avançado

### **Página de Verificação Manual**
- **URL:** `check-deposits.html`
- **Uso:** Clique em "Verificar Depósitos Agora" para ver o erro técnico exato retornado pela PlinqPay.

### **Logs do Banco**
- Verifique a tabela `system_logs` para ver o histórico de tentativas do Webhook.

---

## 🔐 Segurança
✅ **Validação de duplicação** - Mesmo aprovando manualmente, o sistema impede crédito duplo.
✅ **Transação atômica** - Garante que o saldo seja atualizado corretamente.

---

**✅ Novas ferramentas de gestão implementadas com sucesso!**
