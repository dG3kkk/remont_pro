const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'remont_pro_secret_2024';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── In-memory "database" ───────────────────────────────────────────────────

const users = [
  {
    id: 1,
    name: 'Администратор',
    email: 'admin@remont-pro.ru',
    // password: admin123  (намеренный баг: пароль хранится в plain-text в комментарии — баг безопасности #1)
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: '2023-01-15'
  },
  {
    id: 2,
    name: 'Менеджер Иван',
    email: 'manager@remont-pro.ru',
    password: bcrypt.hashSync('manager456', 10),
    role: 'manager',
    createdAt: '2023-03-22'
  },
  {
    id: 3,
    name: 'Клиент Тестовый',
    email: 'test@mail.ru',
    password: bcrypt.hashSync('test123', 10),
    role: 'client',
    createdAt: '2024-01-10'
  }
];

const orders = [
  { id: 1, clientName: 'Анна Петрова', phone: '+7 916 123-45-67', service: 'Капитальный ремонт', address: 'ул. Ленина, 12, кв. 34', area: 65, status: 'completed', createdAt: '2024-01-10', price: 487500 },
  { id: 2, clientName: 'Дмитрий Козлов', phone: '+7 926 987-65-43', service: 'Ремонт ванной', address: 'пр. Мира, 88, кв. 5', area: 8, status: 'in_progress', createdAt: '2024-02-14', price: 72000 },
  { id: 3, clientName: 'Светлана Иванова', phone: '+7 903 555-12-34', service: 'Косметический ремонт', address: 'ул. Садовая, 3, кв. 101', area: 42, status: 'pending', createdAt: '2024-03-01', price: 126000 },
  { id: 4, clientName: 'Михаил Сергеев', phone: '+7 977 234-56-78', service: 'Ремонт кухни', address: 'б-р Победы, 17, кв. 22', area: 14, status: 'in_progress', createdAt: '2024-03-15', price: 98000 },
  { id: 5, clientName: 'Ольга Новикова', phone: '+7 916 777-88-99', service: 'Капитальный ремонт', address: 'ул. Гагарина, 45, кв. 7', area: 90, status: 'pending', createdAt: '2024-03-20', price: 675000 }
];

const services = [
  { id: 1, name: 'Косметический ремонт', pricePerSqm: 3000, description: 'Поклейка обоев, покраска, замена напольного покрытия', duration: '7-14 дней' },
  { id: 2, name: 'Капитальный ремонт', pricePerSqm: 7500, description: 'Полный ремонт с заменой коммуникаций', duration: '30-60 дней' },
  { id: 3, name: 'Ремонт ванной', pricePerSqm: 9000, description: 'Укладка плитки, сантехника, освещение', duration: '10-20 дней' },
  { id: 4, name: 'Ремонт кухни', pricePerSqm: 7000, description: 'Плитка, покраска, установка мебели', duration: '14-21 день' },
  { id: 5, name: 'Ремонт офиса', pricePerSqm: 4500, description: 'Коммерческий ремонт для офисных помещений', duration: '14-30 дней' }
];

// ─── Middleware ──────────────────────────────────────────────────────────────

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Токен недействителен или истёк' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён. Требуются права администратора.' });
  }
  next();
}

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────

// POST /api/auth/login
// БАГ #2: Нет rate limiting — можно брутфорсить пароли без ограничений
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  // БАГ #3: email сравнивается case-sensitive, поэтому Admin@remont-pro.ru не найдёт пользователя
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Пользователь не найден' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    SECRET_KEY,
    { expiresIn: '2h' }
  );

  res.json({
    message: 'Вход выполнен успешно',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  // БАГ #4: Валидация email отсутствует — можно зарегистрироваться с "notanemail"
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  // БАГ #5: Минимальная длина пароля не проверяется
  const newUser = {
    id: users.length + 1,
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    role: 'client',
    createdAt: new Date().toISOString().split('T')[0]
  };

  users.push(newUser);

  res.status(201).json({
    message: 'Регистрация прошла успешно',
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // БАГ #6: Logout не инвалидирует токен на сервере — токен остаётся действительным до истечения
  res.json({ message: 'Выход выполнен' });
});

// ─── ORDERS ROUTES ────────────────────────────────────────────────────────────

// GET /api/orders — только для авторизованных
app.get('/api/orders', authenticateToken, (req, res) => {
  if (req.user.role === 'client') {
    // Клиент видит только свои заявки (по имени — упрощение)
    return res.json(orders.slice(0, 2));
  }
  res.json(orders);
});

// GET /api/orders/:id
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json(order);
});

// POST /api/orders — создать заявку (публично, без авторизации — форма на сайте)
app.post('/api/orders', (req, res) => {
  const { clientName, phone, service, address, area } = req.body;

  if (!clientName || !phone || !service) {
    return res.status(400).json({ error: 'Имя, телефон и услуга обязательны' });
  }

  const serviceData = services.find(s => s.name === service);
  const price = serviceData && area ? serviceData.pricePerSqm * area : null;

  const newOrder = {
    id: orders.length + 1,
    clientName,
    phone,
    service,
    address: address || 'Не указан',
    area: area || null,
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
    price
  };

  orders.push(newOrder);
  res.status(201).json({ message: 'Заявка принята', order: newOrder });
});

// PATCH /api/orders/:id/status — обновить статус (только admin/manager)
app.patch('/api/orders/:id/status', authenticateToken, (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Заявка не найдена' });

  const { status } = req.body;
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

  // БАГ #7: Нет проверки роли — любой авторизованный может менять статус заявки
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  order.status = status;
  res.json({ message: 'Статус обновлён', order });
});

// DELETE /api/orders/:id — только admin
app.delete('/api/orders/:id', authenticateToken, requireAdmin, (req, res) => {
  const index = orders.findIndex(o => o.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Заявка не найдена' });

  orders.splice(index, 1);
  res.json({ message: 'Заявка удалена' });
});

// ─── SERVICES ROUTES ─────────────────────────────────────────────────────────

// GET /api/services — публично
app.get('/api/services', (req, res) => {
  res.json(services);
});

// GET /api/services/:id
app.get('/api/services/:id', (req, res) => {
  const service = services.find(s => s.id === parseInt(req.params.id));
  if (!service) return res.status(404).json({ error: 'Услуга не найдена' });
  res.json(service);
});

// ─── USERS ROUTES (admin only) ───────────────────────────────────────────────

// GET /api/users
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })));
});

// DELETE /api/users/:id
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const index = users.findIndex(u => u.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Пользователь не найден' });

  // БАГ #8: Можно удалить самого себя — нет проверки req.user.id !== target.id
  users.splice(index, 1);
  res.json({ message: 'Пользователь удалён' });
});

// ─── CALCULATOR ──────────────────────────────────────────────────────────────

// POST /api/calculate
app.post('/api/calculate', (req, res) => {
  const { serviceId, area } = req.body;

  if (!serviceId || !area) {
    return res.status(400).json({ error: 'Укажите услугу и площадь' });
  }

  const service = services.find(s => s.id === parseInt(serviceId));
  if (!service) return res.status(404).json({ error: 'Услуга не найдена' });

  // БАГ #9: Нет валидации на отрицательные числа и ноль — можно передать area: -50
  const total = service.pricePerSqm * parseFloat(area);

  res.json({
    service: service.name,
    area: parseFloat(area),
    pricePerSqm: service.pricePerSqm,
    total,
    duration: service.duration
  });
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── SERVE FRONTEND ──────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏠 РемонтПро сервер запущен: http://localhost:${PORT}`);
  console.log(`📋 API документация:`);
  console.log(`   POST /api/auth/login       — Вход`);
  console.log(`   POST /api/auth/register    — Регистрация`);
  console.log(`   GET  /api/auth/me          — Текущий пользователь`);
  console.log(`   POST /api/auth/logout      — Выход`);
  console.log(`   GET  /api/orders           — Список заявок [auth]`);
  console.log(`   POST /api/orders           — Создать заявку`);
  console.log(`   GET  /api/services         — Список услуг`);
  console.log(`   POST /api/calculate        — Калькулятор стоимости`);
  console.log(`   GET  /api/users            — Список пользователей [admin]`);
  console.log(`\n👤 Тестовые аккаунты:`);
  console.log(`   admin@remont-pro.ru  / admin123  (admin)`);
  console.log(`   manager@remont-pro.ru / manager456 (manager)`);
  console.log(`   test@mail.ru         / test123   (client)\n`);
});
