<template>
  <h1>Status {{ status }}</h1>
  <main class="sections">
    <USection>
      <template #header>
        <h2>Unary</h2>
      </template>
      <template #main>
        <UList :responses="sayUnaryLog"> </UList>
      </template>
      <template #footer>
        <UFormUnary :onSubmit="sayHello" :onCancel="sayAbort" />
      </template>
    </USection>
    <USection>
      <template #header>
        <h2>Client Stream</h2>
      </template>
      <template #main><UList :responses="clientStreamLog" /></template>
      <template #footer>
        <UFormStream
          :isOpened="isOpenClientStream"
          :isSended="isSendClientStream"
          @open="sayHelloClientStream"
          @abort="sayAbortClientStream"
          @send="saySendClientStream"
          @complete="sayCompleteClientStream"
        />
      </template>
    </USection>
    <USection>
      <template #header>
        <h2>Server Stream</h2>
      </template>
      <template #main> <UList :responses="serverStreamLog" /></template>
      <template #footer> <UFormUnary :onSubmit="sayHelloServerStream" :onCancel="sayAbortServerStream" /> </template>
    </USection>
    <USection>
      <template #header>
        <h2>Duplex Stream</h2>
      </template>
      <template #main><UList :responses="duplexStreamLog" /></template>
      <template #footer>
        <UFormStream
          :isOpened="isOpenDuplexStream"
          :isSended="isSendDuplexStream"
          @open="sayHelloDuplexStream"
          @abort="sayAbortDuplexStream"
          @send="saySendDuplexStream"
          @complete="sayCompleteDuplexStream"
        />
      </template>
    </USection>
  </main>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import { tryOnMounted } from "@vueuse/core";

import {
  WebSocketTransport,
  WebSocketTransportState,
  MethodError,
  Status,
  type IClientStream,
  type IServerStream,
  type IDuplexStream,
  type UnaryResponse
} from "../u-connect";
// import { decode, encode } from "@msgpack/msgpack";
import USection from "./components/uSection.vue";
import UFormUnary from "./components/uFormUnary.vue";
import UFormStream from "./components/uFormStream.vue";
import UList from "./components/uList.vue";

const status = ref(WebSocketTransportState[WebSocketTransportState.CLOSED]);

/**
 * HelloService interface definition for remote call.
 */
interface HelloService {
  SayHello(name: string): UnaryResponse<string>;
  SayHelloClientStream(): IClientStream<string, string>;
  SayHelloServerStream(name: string): IServerStream<string, "SayHelloServerStream">;
  SayHelloDuplexStream(): IDuplexStream<string, string, "SayHelloDuplexStream">;
}
const transport = new WebSocketTransport({
  url: `ws://${window.location.host}/api/ws`,
  debug: true,
  // serializer: {
  //   decoder(data) {
  //     const p = decode(data);
  //     console.log("response", p);
  //     return p;
  //   },
  //   encoder(message) {
  //     console.log("request", message);
  //     return encode(message);
  //   }
  // },
  reconnectDelay(reconnects) {
    console.log(`reconnecting ${reconnects}`);
    return 1000 * reconnects;
  }
});

transport.on("status", (s) => {
  status.value = WebSocketTransportState[s];
});

const helloService = transport.service<HelloService>("HelloService");

//#region unary request
let abortUnary: AbortController | null = null;
const sayUnaryLog = ref<string[]>([]);
const sayHello = async (name: string) => {
  console.time("sayHello " + name);
  try {
    sayAbort();
    abortUnary = new AbortController();
    const sayRes = await helloService.unary("SayHello", name, { abort: abortUnary.signal });
    sayUnaryLog.value.push(`say ${name}: ${Status[sayRes.status]}, response: ${sayRes.response}`);
  } catch (error) {
    const { status, message } = error as MethodError;
    console.log(`error status: ${status}, message: ${message}`);
    sayUnaryLog.value.push(`say error ${name}: ${message}`);
  }
  console.timeEnd("sayHello " + name);
};

const sayAbort = () => {
  abortUnary?.abort();
  abortUnary = null;
};
//#endregion

//#region client stream
const clientStreamLog = ref<string[]>([]);
let abortClientStream: AbortController | null = null;
const stream = shallowRef<IClientStream<string, string>>();
const isOpenClientStream = ref(false);
const isSendClientStream = ref(false);

const sayHelloClientStream = async () => {
  sayAbortClientStream();
  abortClientStream = new AbortController();
  isOpenClientStream.value = true;
  try {
    stream.value = await helloService.clientStream("SayHelloClientStream", { abort: abortClientStream?.signal });
  } catch (error) {
    const { status, message } = error as MethodError;
    console.log("client stream error", error);
    isOpenClientStream.value = false;
    clientStreamLog.value.push(`client stream open error status: ${status}, message: ${message}`);
  }
};

const sayAbortClientStream = () => {
  isOpenClientStream.value = false;
  abortClientStream?.abort();
  abortClientStream = null;
};

const saySendClientStream = async (message: string) => {
  if (isSendClientStream.value) return;
  try {
    isSendClientStream.value = true;
    await stream.value?.send(message);
    clientStreamLog.value.push(`say client stream send: ${message}`);
  } catch (error) {
    const { status, message } = error as MethodError;

    console.log(`say client stream error status: ${status}, message: ${message}`);
    clientStreamLog.value.push(`say client stream error: ${message}`);
  } finally {
    isSendClientStream.value = false;
  }
};
const sayCompleteClientStream = async () => {
  if (!stream.value) return;
  try {
    const response = await stream.value.complete();
    clientStreamLog.value.push(`say client stream complete: status: ${Status[response.status]}, response: ${response.response}`);
  } catch (error) {
    const { status, message } = error as MethodError;
    console.log(`say client stream error status: ${status}, message: ${message}`);
  } finally {
    isOpenClientStream.value = false;
    stream.value = undefined;
  }
};

//#endregion

//#region server stream
const serverStreamLog = ref<string[]>([]);
let abortServerStream: AbortController | null = null;

const sayHelloServerStream = async (name: string) => {
  return new Promise<void>((resolve) => {
    try {
      sayAbortServerStream();
      abortServerStream = new AbortController();
      const sayRes = helloService.serverStream("SayHelloServerStream", name, { abort: abortServerStream.signal });
      sayRes.onMessage((data) => {
        console.log(data);
        serverStreamLog.value.push(`say server stream ${name}: ${data}`);
      });
      sayRes.onError((error) => {
        const { status, message } = error as MethodError;
        console.log(`error status: ${status}, message: ${message}`);
        serverStreamLog.value.push(`say error ${name}: ${message}`);
        resolve();
      });
      sayRes.onEnd((result) => {
        serverStreamLog.value.push(`say server stream end: - ${Status[result.status]}`);
        resolve();
      });
    } catch (error) {
      const { status, message } = error as MethodError;
      console.log(`error status: ${status}, message: ${message}`);
      serverStreamLog.value.push(`say error ${name}: ${message}`);
      resolve();
    }
  });
};

const sayAbortServerStream = () => {
  abortServerStream?.abort();
  abortServerStream = null;
};
//#endregion

//#region duplex request
const duplexStreamLog = ref<string[]>([]);
let abortDuplexStream: AbortController | null = null;
const duplexStream = shallowRef<IDuplexStream<string, string>>();
const isOpenDuplexStream = ref(false);
const isSendDuplexStream = ref(false);

const sayHelloDuplexStream = async () => {
  sayAbortDuplexStream();
  abortDuplexStream = new AbortController();
  isOpenDuplexStream.value = true;
  try {
    const stream = await helloService.duplex("SayHelloDuplexStream", { abort: abortDuplexStream?.signal });
    duplexStream.value = stream;
    duplexStream.value.onMessage((data) => {
      duplexStreamLog.value.push(`say duplex stream response: ${data}`);
    });
    duplexStream.value.onError((error) => {
      const { status, message } = error as MethodError;
      console.log(`say duplex stream error status: ${status}, message: ${message}`);
      duplexStreamLog.value.push(`say duplex stream error: ${message}`);
    });
    duplexStream.value.onEnd((result) => {
      duplexStreamLog.value.push(`say duplex stream end: - ${Status[result.status]}`);
    });
  } catch (error) {
    const { status, message } = error as MethodError;
    console.log(`say duplex stream error status: ${status}, message: ${message}`);
    duplexStreamLog.value.push(`say duplex stream open error: ${message}`);
  }
};

const sayAbortDuplexStream = () => {
  isOpenDuplexStream.value = false;
  abortDuplexStream?.abort();
  abortDuplexStream = null;
};

const saySendDuplexStream = async (message: string) => {
  if (isSendDuplexStream.value) return;
  try {
    isSendDuplexStream.value = true;
    await duplexStream.value?.send(message);
    duplexStreamLog.value.push(`say duplex stream send: ${message}`);
  } catch (error) {
    const { status, message } = error as MethodError;

    console.log(`say duplex stream error status: ${status}, message: ${message}`);
    duplexStreamLog.value.push(`say duplex stream error: ${message}`);
  } finally {
    isSendDuplexStream.value = false;
  }
};
const sayCompleteDuplexStream = async () => {
  if (!duplexStream.value) return;
  try {
    const response = await duplexStream.value.complete();
    duplexStreamLog.value.push(`say duplex stream complete: status: ${Status[response.status]}`);
  } catch (error) {
    const { status, message } = error as MethodError;
    console.log(`say duplex stream error status: ${status}, message: ${message}`);
  } finally {
    isOpenDuplexStream.value = false;
    duplexStream.value = undefined;
  }
};
//#endregion

tryOnMounted(async () => {
  console.log("connecting...");
  await transport.connect();
  console.log("connected");
});
</script>

<style scoped>
.sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  height: 100%;
  width: 100%;
  gap: 1rem;
  overflow: hidden;
}
</style>
../u-connect
