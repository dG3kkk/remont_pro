# 🏠 РемонтПро — Учебный сайт для практики Manual QA

Многостраничный сайт компании по ремонту квартир с бэкендом.

## 📁 Структура проекта

```
remont-pro/
├── backend/
│   └── server.js          # Express API (порт 3000)
├── frontend/
│   ├── index.html          # Главная страница
│   ├── css/
│   │   └── main.css
│   ├── js/
│   │   └── main.js
│   └── pages/
│       ├── login.html      # Страница входа/регистрации
│       ├── admin.html      # Панель управления
│       ├── services.html   # Страница услуг
│       ├── portfolio.html  # Портфолио
│       ├── calculator.html # Калькулятор стоимости
│       └── contacts.html   # Контакты / форма заявки
```

---

## 🔑 Тестовые аккаунты

| Email | Пароль | Роль |
|---|---|---|
| admin@remont-pro.ru | admin123 | admin |
| manager@remont-pro.ru | manager456 | manager |
| test@mail.ru | test123 | client |

---

## 📋 REST API (для Postman)

**Base URL:** `http://localhost:3000/api`

### Авторизация
| Метод | URL | Описание |
|---|---|---|
| POST | /auth/login | Вход. Body: `{email, password}` |
| POST | /auth/register | Регистрация. Body: `{name, email, password}` |
| GET | /auth/me | Текущий пользователь. Header: Bearer токен |
| POST | /auth/logout | Выход. Header: Bearer токен |

### Заявки
| Метод | URL | Доступ |
|---|---|---|
| GET | /orders | Авторизован |
| GET | /orders/:id | Авторизован |
| POST | /orders | Публично |
| PATCH | /orders/:id/status | Авторизован. Body: `{status}` |
| DELETE | /orders/:id | Только admin |

### Услуги
| Метод | URL | Доступ |
|---|---|---|
| GET | /services | Публично |
| GET | /services/:id | Публично |

### Калькулятор
| Метод | URL | Описание |
|---|---|---|
| POST | /calculate | Body: `{serviceId, area}` |

### Пользователи
| Метод | URL | Доступ |
|---|---|---|
| GET | /users | Только admin |
| DELETE | /users/:id | Только admin |

### Health check
| Метод | URL |
|---|---|
| GET | /api/health |

---

## 🧪 Тестовые данные

**Статусы заявок:** `pending`, `in_progress`, `completed`, `cancelled`

**Postman — пример Login:**
```json
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@remont-pro.ru",
  "password": "admin123"
}
```

**Ответ содержит JWT токен**, который нужно подставить в заголовок:
```
Authorization: Bearer <token>
```
