# stream-wallet-sync

Мост **Trust Wallet** ↔ **расширение** (деп USDT → рубли на stream.win, вывод обратно).

## Сейчас сделать (один раз)

### 1. Upstash Redis на Vercel (бесплатно, ~3 мин)

Без Redis на Vercel данные **теряются** при каждом перезапуске функции.

1. [vercel.com](https://vercel.com) → проект **stream-wallet-sync**
2. **Storage** → **Upstash** → **Redis** → **Free**
3. Подключить к проекту
4. **Deployments** → **Redeploy**

Проверка:  
`https://stream-wallet-sync.vercel.app/api/wallet?type=deposit&channel=test`  
В ответе: `"storage":"redis"`.

### 2. Задеплоить код из папки `wallet-sync`

Push в git или:

```bash
cd wallet-sync
npm install
npx vercel --prod
```

### 3. Настроить пару кошелёк + расширение

У **каждого из 5 человек** свой код (channel):

| Где | Действие |
|-----|----------|
| **Расширение** (popup) | «Новый» → скопировать код → «Сохранить» |
| **Trust Wallet** → Настройки | Вставить тот же код → «Сохранить» |

Код `default` — общий (как раньше, только для одного человека).

## API

```
GET/PUT  /api/wallet?type=deposit|withdraw&channel=ch_abc123
```

- `deposit` — отправка из кошелька → казино  
- `withdraw` — вывод с казино → кошелёк  

Статусы депозита: `pending` → `processing` → `completed`.
