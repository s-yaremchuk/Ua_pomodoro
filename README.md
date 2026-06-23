# UA Pomodoro · Swiss Focus Timer

Swiss-style Pomodoro таймер з інтеграцією **Spotify Web Playback SDK**.

![Palette: Navy #1A2744 / Amber #F5C518 / Off-White #F2F0EB](https://placehold.co/600x80/1A2744/F5C518?text=POMODORO+·+FOCUS+TIMER&font=mono)

---

## Функціонал

- 🍅 **Pomodoro таймер** — три режими: Фокус (25 хв), Коротка пауза (5 хв), Довга пауза (15 хв)
- 🎵 **Spotify інтеграція** — повноцінний SDK плеєр з кнопками Play/Pause, Наступний, Попередній трек
- ⛶ **Fullscreen** — кнопка + клавіша `F`
- ⌨️ **Keyboard shortcuts** — `ПРОБІЛ`, `R`, `F`, `←`, `→`
- 💾 **Збереження налаштувань** — localStorage (тривалості, стан авторизації)
- 🔔 **Звуковий сигнал** — Web Audio API (без файлів)
- 📱 **Responsive** — адаптивний дизайн

## Дизайн

**Swiss International / Constructivist** стиль:
- Шрифти: [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) (таймер) + [DM Mono](https://fonts.google.com/specimen/DM+Mono) (UI)
- Палітра: Deep Navy `#1A2744` · Vivid Amber `#F5C518` · Off-White `#F2F0EB`

---

## Запуск локально

```bash
# Потрібен простий HTTP сервер (файли підключені як ES Modules)
npx serve . -l 3000
```

Відкрийте: **http://127.0.0.1:3000**

> ⚠️ Не відкривайте `index.html` напряму через `file://` — ES Modules не працюють без HTTP сервера.

---

## Налаштування Spotify

### 1. Spotify Developer Dashboard

1. Зайдіть на [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Створіть або відкрийте ваш додаток
3. Додайте **Redirect URI**: `http://127.0.0.1:3000/callback` (з квітня 2025 року Spotify більше не дозволяє додавати `localhost` безпосередньо як домен, тому обов'язково використовуйте IP-адресу `127.0.0.1`).
4. Натисніть **Add**, а потім обов'язково натисніть **Save** внизу сторінки!
5. Скопіюйте **Client ID**

### 2. Вставте Client ID у код

Відкрийте `spotify.js` і замініть:
```js
const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
```
на ваш реальний Client ID.

### 3. Для GitHub Pages

Додайте ще один Redirect URI у Spotify Dashboard:
```
https://<ваш-username>.github.io/<назва-репо>/callback
```

І оновіть `REDIRECT_URI` у `spotify.js`:
```js
const REDIRECT_URI = 'https://<ваш-username>.github.io/<назва-репо>/callback';
```

> **Вимога:** Spotify Premium акаунт для Web Playback SDK.

---

## Клавіатурні скорочення

| Клавіша | Дія |
|---------|-----|
| `ПРОБІЛ` | Старт / Пауза таймера |
| `R` | Скинути таймер |
| `F` | Fullscreen |
| `→` | Наступний трек |
| `←` | Попередній трек |

---

## Структура проєкту

```
Ua_pomodoro/
├── index.html      — Структура сторінки
├── style.css       — Дизайн-система (Swiss grid, токени, анімації)
├── app.js          — Основна логіка, UI, Fullscreen, keyboard
├── timer.js        — Pomodoro Timer клас + Web Audio сигнал
├── spotify.js      — Spotify SDK, PKCE OAuth, transport controls
├── favicon.svg     — SVG favicon (Navy + Amber)
└── README.md       — Ця документація
```

---

## Git комміти

Проєкт використовує українські описові коміти у форматі:
```
feat: короткий опис
- Детальна зміна 1
- Детальна зміна 2
```
