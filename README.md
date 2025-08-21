# u-connect/client-ts

<img width="480px" src="https://raw.githubusercontent.com/undefinedofficial/u-connect-client-ts/main/u-connect-logo.jpg">

u-connect - это современная высокопроизводительная платформа удаленного вызова процедур с открытым исходным кодом.
Она позволяет эффективно создавать и подключать сервисы для обмена данными между ними.

Использует по умолчанию бинарный протокол обмена данными MessagePack который почти не уступает ProtoBuf и заметно эффективнее json.

### Отлично подходит когда:<br/>

1. Данные часто меняются и их нужно синхронизировать.
2. Обмен данными в реальном времени с высокой скоростью.
3. Много конечных точек где нужно отслеживать запрос с обоих сторон.
4. Данные присылаются частично.
5. Большое кол-во потоков данных.
6. Подключение долго остается открытым.

### Установка

```bash
npm install https://github.com/undefinedofficial/u-connect-client-ts.git
# or
yarn add https://github.com/undefinedofficial/u-connect-client-ts.git
# or
pnpm install https://github.com/undefinedofficial/u-connect-client-ts.git
```

### UConnectClient

Перед взаимодействием с сервером необходимо создать экземпляр канала подключения и RPC-клиента.

```ts
// Создание клиента и подключение
const connection = new WebSocketConnection({
  url: "url", // url подключения к u-connect серверу.
  // задержка при переподключении (false для отключения или число для статической задержки)
  reconnectDelay(reconnects) {
    console.log(`reconnecting ${reconnects}`);
    return 1000 * reconnects;
  }
  // По умолчанию используется WebSocket WebApi, вы можете использовать WebSocket из модуля  "ws" для использования на Node.js
  // client: WebSocket
});
const client = new UConnectClient({
  connection,
  logger: new ConsoleLogger() // вывод полезной информации для отладки в консоль.
});
```

### Для обмена данными существуют 4 типа взаимодействия:

1. Unary - запрос --- ответ.
2. ServerStream - запрос --> поток данных.
3. ClientStream - поток данных >-- ответ.
4. DuplexStream - поток данных <-> поток данных.

### 1. Unary Request

Традиционный запрос от клиента за которым следует ответ сервера после чего запрос завершен.

Пример:

```ts
import { UConnectClient, type UnaryResponse } from "@u-connect/client-ts";

interface HelloService {
  SayHello(name: string): UnaryResponse<string>;
}

const client = new UConnectClient({ url: "url" });
const helloService = client.service<HelloService>("HelloService");
const sayRes = await helloService.unary("SayHello", "john");

// Hello john!
console.log(sayRes.response);
```

### 2. Server Stream Request

Традиционный запрос от клиента за которым следует множество данных от сервера после чего запрос завершен.

Серверная потоковая передача. Вызов инициируется клиентом серверу при этом клиент может передать сообщение, после чего сервер может записывать в поток в соответствии с требованиями приложения.
<br/>Например, сервер может получить строку от клиента, после чего искать и сразу же отправлять совпадения или бесконечный поток телеметрии.

Пример:

```ts
import { UConnectClient, type IServerStream, MethodError } from "@u-connect/client-ts";

interface HelloService {
  SayHelloServerStream(name: string): IServerStream<string>;
}

const client = new UConnectClient({ url: "url" });
const helloService = client.service<HelloService>("HelloService");
const sayServerStream = helloService.serverStream("SayHelloServerStream", "john");
sayServerStream.onMessage((data) => {
  console.log(data);
});
sayServerStream.onError((error) => {
  const { status, message } = error as MethodError;
  console.log(`error status: ${status}, message: ${message}`);
});
sayServerStream.onEnd((result) => {
  const status = result.status;
  console.log(`end stream with status: ${status}`);
});
```

### 2. Client Stream Request

Клиентская потоковая передача. Клиент отправляет сообщения пока сервер дожидается всех сообщений от клиента, прежде чем отправить ответ. Вызов инициируется клиентом серверу, после чего поток становится доступным клиенту для записи.

Пример:

```ts
import { UConnectClient, type IClientStream, MethodError } from "@u-connect/client-ts";

interface HelloService {
  SayHelloClientStream(): IClientStream<string, string>;
}

const client = new UConnectClient({ url: "url" });
const helloService = client.service<HelloService>("HelloService");
const sayClientStream = helloService.clientStream("SayHelloClientStream");

try {
  for (let i = 0; i < 10; i++) {
    await sayClientStream.send(`john ${i};`);
  }
  const result = await sayClientStream.complete();
  console.log(`end stream with status: ${result.status} and response ${result.response}`);
} catch (error) {
  if (error instanceof MethodError) {
    const { status, message } = error;
    console.log(`error status: ${status}, message: ${message}`);
  }
}
```

### 2. Duplex Stream Request

Двусторонняя потоковая передача. Клиент и сервер отправляют друг другу сообщения через отдельные потоки чтения и записи. Вызов инициируется клиентом серверу, после чего потоки становятся доступными. Потоки независимы друг от друга, поэтому клиент и сервер могут считывать и записывать в потоки в соответствии с требованиями их собственных приложений. <br/>Например, сервер может дождаться всех сообщений от клиента, прежде чем отправить ответ, или он может ответить немедленно и использовать стиль общения с клиентом в стиле “пинг-понга”, похожий на чат.

Пример:

```ts
import { UConnectClient, type IDuplexStream } from "@u-connect/client-ts";

interface HelloService {
  SayHelloDuplexStream(): IDuplexStream<string, string>;
}

const client = new UConnectClient({ url: "url" });
const helloService = client.service<HelloService>("HelloService");
const sayDuplexStream = helloService.duplex("SayHelloDuplexStream");

sayDuplexStream.onMessage((data) => {
  console.log(data);
});
sayDuplexStream.onError((error) => {
  const { status, message } = error as MethodError;
  console.log(`error status: ${status}, message: ${message}`);
});
sayDuplexStream.onEnd((result) => {
  const status = result.status;
  console.log(`end stream with status: ${status}`);
});

try {
  for (let i = 0; i < 10; i++) {
    await sayDuplexStream.send(`john ${i};`);
  }
  const result = await sayDuplexStream.complete();
  console.log(`end stream with status: ${result.status}`);
} catch (error) {
  if (error instanceof MethodError) {
    const { status, message } = error;
    console.log(`error status: ${status}, message: ${message}`);
  }
}
```

### Параметры запроса.

При любом из вышеперечисленных запросов клиент может указать дополнительные параметры ServiceMethodOptions:

1. abort - AbortSignal используется для прерывания или отмены запроса.
2. meta - мета-данные ключ-значение которые передаются при отправке запроса.
3. timeout - позволяет клиенту указать в миллисекундах, как долго он готов ждать завершения RPC, прежде чем он завершится с ошибкой.

### Результат запроса.

По завершению запроса или потока, сервер может передать некоторые данные такие как:

1. status - Статус код по умолчанию OK(0), сервер может устанавливать статус как с ошибкой так и без.

Список статусов:

```ts
const enum Status {
  OK, // Запрос прошел успешно (по умолчанию).
  CANCELLED, // Запрос отменен клиентом
  UNKNOWN, // Неизвестная ошибка.
  INVALID_ARGUMENT, // Клиент указал недопустимый аргумент.
  DEADLINE_EXCEEDED, // Сервер не уложился в определенный клиентом срок и уже не важно успешно выполнился или с ошибкой.
  NOT_FOUND, // Запрашиваймого ресурса не существует.
  ALREADY_EXISTS, // Пытается создать, то что уже существует.
  PERMISSION_DENIED, // Недостаточно прав для совершения этой операции.
  RESOURCE_EXHAUSTED, // Какой то ресурс исчерпан.
  FAILED_PRECONDITION, // Операция отменена из-за невозможности выполнения, (например удаление ресурса который используется).
  ABORTED, // Операция отменена из-за паралелизма (например транзакция уже выполняется).
  OUT_OF_RANGE, // Операция отменена из-за выхода за допустимые пределы (например запрос извлечения из бд за её пределами)
  UNIMPLEMENTED, // Не реальзованно или не поддерживается.
  INTERNAL, // Внутренняя ошибка сервера.
  UNAVAILABLE, // На данный момент операция не доступна, следует повторить попытку позже.
  DATA_LOSS, // Попытка выйти за границы диапазона (например попытка получить данные после конца).
  UNAUTHENTICATED // Операция требует авторизации.
}
```

2. method - Полное имя метода.

3. meta - Мета-данные ключ-значение которые передаются от сервера-клиенту.

4. response - Результат выполнения метода (Только в Unary и ClientStream запросах).

## Сервер

https://github.com/undefinedofficial/u-connect-server-ts
