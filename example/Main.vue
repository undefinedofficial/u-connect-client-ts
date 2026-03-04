<template>
  <div class="u-connect-tester" :class="theme">
    <div class="header">
      <h1>U-Connect Tester</h1>
      <div class="theme-toggle">
        <button @click="toggleTheme" class="theme-toggle-btn">
          {{ theme === "dark" ? "☀️" : "🌙" }}
        </button>
      </div>

      <!-- Connection status with animation -->
      <div class="connection-status-container">
        <div class="connection-status" :class="{ connected: isConnected, connecting: connectionStatus === 'Connecting...' }">
          <span class="status-dot" :class="{ connected: isConnected, connecting: connectionStatus === 'Connecting...' }"></span>
          {{ isConnected ? "Connected" : connectionStatus || "Disconnected" }}
        </div>
        <div v-if="connectionStatus === 'Connecting...'" class="connection-animation">
          <div class="pulse-dot"></div>
          <div class="pulse-dot"></div>
          <div class="pulse-dot"></div>
        </div>
      </div>
    </div>

    <div class="main-container">
      <!-- Left sidebar with request list -->
      <div class="sidebar">
        <div class="connection-form">
          <div class="form-group">
            <label>Server URL:</label>
            <input v-model="connectionUrl" placeholder="ws://localhost:8080" :readonly="isConnected" />
          </div>
          <button @click="connect" :disabled="isConnected">
            {{ isConnected ? "Connected" : "Connect" }}
          </button>
          <button v-if="isConnected" @click="disconnect" class="disconnect-btn">Disconnect</button>
        </div>

        <div class="request-list">
          <div class="request-list-header">
            <h3>Requests</h3>
            <div class="request-actions">
              <button @click="importCollection" title="Import collection">
                <span>📥</span>
              </button>
              <button @click="exportCollection" title="Export collection">
                <span>📤</span>
              </button>
              <button @click="addRequest" title="Add new request">
                <span>+</span>
              </button>
            </div>
          </div>

          <div class="request-items">
            <div
              v-for="(request, index) in requests"
              :key="index"
              class="request-item"
              :class="{ active: activeRequestIndex === index }"
              @click="selectRequest(index)"
            >
              <div class="request-info">
                <div class="request-method">{{ request.methodType }}</div>
                <div class="request-name">{{ request.name || "Unnamed Request" }}</div>
              </div>
              <div class="request-item-actions">
                <button @click.stop="duplicateRequest(index)" title="Duplicate">
                  <span>📋</span>
                </button>
                <button @click.stop="deleteRequest(index)" title="Delete">
                  <span>✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main content area -->
      <div class="content">
        <!-- Request configuration (top half) -->
        <div class="request-config">
          <div class="request-header">
            <div class="form-group inline">
              <label>Request Name:</label>
              <input v-model="currentRequest.name" placeholder="Request name" />
            </div>
            <div class="form-group inline">
              <label>Method Type:</label>
              <select v-model="currentRequest.methodType">
                <option value="unary">Unary</option>
                <option value="serverStream">Server Stream</option>
                <option value="clientStream">Client Stream</option>
                <option value="duplexStream">Duplex Stream</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Service:</label>
              <input v-model="currentRequest.service" placeholder="HelloService" />
            </div>
            <div class="form-group">
              <label>Method:</label>
              <input v-model="currentRequest.method" placeholder="SayHello" />
            </div>
            <div class="form-group">
              <label>Timeout (ms):</label>
              <input
                :value="currentRequest.timeout || 'none'"
                @change="(e)=> {
                    currentRequest.timeout = parseInt((e.target as any).value);
                    if(!currentRequest.timeout) currentRequest.timeout = undefined;
                  }"
                type="number"
                placeholder="none"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Request Data:</label>
              <!-- <textarea v-model="currentRequest.data" placeholder='{"name": "John"}'></textarea> -->
              <json-editor
                height="400"
                mode="text"
                :darkTheme="theme === 'dark'"
                :navigationBar="false"
                v-model:text="currentRequest.data"
              />
            </div>
            <div class="form-group">
              <label>Metadata (JSON):</label>
              <json-editor
                height="400"
                mode="text"
                :darkTheme="theme === 'dark'"
                :navigationBar="false"
                v-model:text="currentRequest.metadata"
              />
            </div>
          </div>

          <div class="request-actions">
            <button @click="saveRequest" class="save-btn">
              <span class="btn-icon">💾</span>
              <span class="btn-text">Save</span>
            </button>
            <button v-if="!isExecuting" @click="executeRequest" class="execute-btn" :disabled="!isConnected">
              <span class="btn-icon">▶️</span>
              <span class="btn-text">Execute</span>
            </button>
            <button v-else @click="cancelRequest" class="cancel-btn">
              <span class="btn-icon">⏹️</span>
              <span class="btn-text">Cancel</span>
            </button>
          </div>
        </div>

        <!-- Response display (bottom half) -->
        <div class="response-display">
          <div class="response-tabs">
            <button @click="activeTab = 'response'" :class="{ active: activeTab === 'response' }">Response</button>
            <button @click="activeTab = 'stream'" :class="{ active: activeTab === 'stream' }" v-if="isStream">Stream Messages</button>
            <button @click="activeTab = 'metadata'" :class="{ active: activeTab === 'metadata' }">Metadata</button>

            <div class="response-status">Status: {{ responseStatus }}</div>
          </div>

          <div class="response-content">
            <div v-if="activeTab === 'response'" class="response-tab">
              <pre>{{ responseData ?? "void" }}</pre>
            </div>

            <div v-if="activeTab === 'stream' && isStream" class="response-tab">
              <div class="stream-messages">
                <div v-for="(msg, index) in streamMessages" :key="index" class="stream-message">
                  {{ msg }}
                </div>
              </div>
              <div v-if="isWriteStream" class="stream-input">
                <input v-model="streamInput" placeholder="Enter message to send" @keyup.enter="sendStreamMessage" />
                <button @click="sendStreamMessage">Send</button>
                <button @click="completeStream" class="complete-btn">Complete Stream</button>
              </div>
            </div>

            <div v-if="activeTab === 'metadata'" class="response-tab">
              <div class="metadata-list">
                <div v-if="!responseMetadata" class="empty-state">No metadata available</div>
                <div v-else>
                  <div v-for="[key, value] in Object.entries(responseMetadata)" :key="key" class="metadata-item">
                    <span class="metadata-key">{{ key }}:</span>
                    <span class="metadata-value">{{ value }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, watch, onUnmounted, onMounted, computed } from "vue";
import {
  UConnectClient,
  WebSocketConnection,
  ConsoleLogger,
  type UnaryResponse,
  type IServerStream,
  type IClientStream,
  type IDuplexStream,
  type ServiceMethodOptions,
  Status,
  MethodError
} from "../u-connect";
import JsonEditor from "vue3-ts-jsoneditor";

// Interface for a saved request
interface RequestConfig {
  id: string;
  name: string;
  service: string;
  method: string;
  methodType: "unary" | "serverStream" | "clientStream" | "duplexStream";
  data: string;
  metadata: string;
  timeout?: number;
}

// Theme management
const theme = shallowRef<"light" | "dark">("light");
watch(theme, (theme) => (document.querySelector("html")!.dataset.theme = theme), { immediate: true });

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light";
  localStorage.setItem("u-connect-tester-theme", theme.value);
}

// Load saved theme preference
if (localStorage.getItem("u-connect-tester-theme") === "dark") {
  theme.value = "dark";
}

// Connection state
const connectionUrl = ref("ws://localhost:3000/api/ws");
const isConnected = ref(false);
const connectionStatus = ref("");
const connection = shallowRef<WebSocketConnection | null>(null);
const client = shallowRef<UConnectClient | null>(null);

// Requests management
const requests = ref<RequestConfig[]>([]);

// Watch for changes in requests and connectionUrl to save to localStorage
watch(requests, saveData, { deep: true });

watch(connectionUrl, saveData);
const activeRequestIndex = shallowRef<number>(-1);
const currentRequest = ref<RequestConfig>({
  id: "",
  name: "",
  service: "HelloService",
  method: "SayHello",
  methodType: "unary",
  data: "",
  metadata: "{}"
});

// Response state
const activeTab = shallowRef<"response" | "stream" | "metadata" | "status">("response");
const responseData = shallowRef("");
const responseMetadata = shallowRef<Readonly<Record<string, string>>>({});
const responseStatus = shallowRef("");
const streamMessages = ref<string[]>([]);
const streamInput = shallowRef("");
const isExecuting = shallowRef(false);

// Current stream reference
const currentStream = shallowRef<IServerStream<any> | IClientStream<any, any> | IDuplexStream<any, any> | null>(null);

// Abort controller for current request
let abortController: AbortController | null = null;

const isWriteStream = computed(
  () => currentRequest.value.methodType === "clientStream" || currentRequest.value.methodType === "duplexStream"
);
const isStream = computed(() => ["serverStream", "clientStream", "duplexStream"].includes(currentRequest.value.methodType));

// Save data to localStorage
function saveData() {
  const dataToSave = {
    connectionUrl: connectionUrl.value,
    requests: requests.value
  };
  localStorage.setItem("u-connect-tester-data", JSON.stringify(dataToSave));
}

// Export collection to file
function exportCollection() {
  const dataToExport = {
    connectionUrl: connectionUrl.value,
    requests: requests.value,
    timestamp: new Date().toISOString()
  };

  const dataStr = JSON.stringify(dataToExport, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `u-connect-collection-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import collection from file
function importCollection() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);

        if (importedData.connectionUrl) {
          connectionUrl.value = importedData.connectionUrl;
        }

        if (importedData.requests && Array.isArray(importedData.requests)) {
          requests.value = importedData.requests;
          if (requests.value.length > 0) {
            activeRequestIndex.value = 0;
            currentRequest.value = { ...requests.value[0] };
          }
        }

        saveData();
      } catch (error) {
        console.error("Error importing collection:", error);
        alert("Error importing collection. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Cancel current request
function cancelRequest() {
  if (!abortController) return;

  abortController.abort();
  abortController = null;
  responseStatus.value = "Request cancelled";
}

// Load data from localStorage
function loadData() {
  const savedData = localStorage.getItem("u-connect-tester-data");
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      connectionUrl.value = parsedData.connectionUrl || "ws://localhost:3000/api/ws";
      requests.value = parsedData.requests || [];

      // Select the first request if available
      if (requests.value.length > 0) {
        activeRequestIndex.value = 0;
        currentRequest.value = { ...requests.value[0] };
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  }
}

// Connect to server
async function connect() {
  try {
    connectionStatus.value = "Connecting...";

    // Close existing connection if it exists
    if (connection.value) {
      await disconnect();
    }

    const newConnection = new WebSocketConnection({
      url: connectionUrl.value,
      reconnectDelay(reconnects: number, e: any) {
        console.log(`Reconnecting (attempt ${reconnects})...`);
        connectionStatus.value = `Reconnecting (attempt ${reconnects})...`;
        return 1000 * Math.min(reconnects, 10);
      }
    });

    // Connection event handlers
    newConnection.addEventListener("open", () => {
      isConnected.value = true;
      connectionStatus.value = "Connected";
    });

    newConnection.addEventListener("close", () => {
      isConnected.value = false;
      connectionStatus.value = "Disconnected";
    });

    newConnection.addEventListener("error", (error: Error) => {
      connectionStatus.value = `Error: ${error.message}`;
    });

    connection.value = newConnection;
    client.value = new UConnectClient({
      connection: newConnection,
      logger: new ConsoleLogger()
    });

    await newConnection.connect();
  } catch (error) {
    connectionStatus.value = `Connection failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error("Connection error:", error);
  }
}

// Disconnect from server
async function disconnect() {
  try {
    if (connection.value) {
      connectionStatus.value = "Disconnecting...";
      connection.value.close();
      connection.value = null;
    }

    if (client.value) {
      currentStream.value = null;

      client.value = null;
    }

    isConnected.value = false;
    connectionStatus.value = "Disconnected";
  } catch (error) {
    connectionStatus.value = `Disconnection error: ${error instanceof Error ? error.message : String(error)}`;
    console.error("Disconnection error:", error);
  }
}

// Clean up on component unmount
onUnmounted(() => {
  disconnect();
});

// Load saved data on component mount
loadData();

// Handle Ctrl+S for saving the request
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveRequest();
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
});

// Request management functions
function addRequest() {
  const newRequest: RequestConfig = {
    id: Date.now().toString(),
    name: `Request ${requests.value.length + 1}`,
    service: "HelloService",
    method: "SayHello",
    methodType: "unary",
    data: "",
    metadata: "{}"
  };

  requests.value.push(newRequest);
  selectRequest(requests.value.length - 1);
}

function duplicateRequest(index: number) {
  const duplicated = { ...requests.value[index] };
  duplicated.id = Date.now().toString();
  duplicated.name = `${duplicated.name} (copy)`;
  requests.value.push(duplicated);
  selectRequest(requests.value.length - 1);
}

function deleteRequest(index: number) {
  requests.value.splice(index, 1);
  if (activeRequestIndex.value >= index) {
    activeRequestIndex.value = Math.max(0, activeRequestIndex.value - 1);
  }
  if (requests.value.length > 0) {
    selectRequest(activeRequestIndex.value);
  } else {
    currentRequest.value = {
      id: "",
      name: "",
      service: "HelloService",
      method: "SayHello",
      methodType: "unary",
      data: "",
      metadata: "{}"
    };
    activeRequestIndex.value = -1;
  }
}

function selectRequest(index: number) {
  activeRequestIndex.value = index;
  currentRequest.value = { ...requests.value[index] };

  // Reset response state when selecting a new request
  responseData.value = "";
  responseMetadata.value = {};
  responseStatus.value = "";
  streamMessages.value = [];
}

function saveRequest() {
  if (activeRequestIndex.value >= 0) {
    requests.value[activeRequestIndex.value] = { ...currentRequest.value };
  } else {
    // If it's a new request, add it to the list
    const newRequest = { ...currentRequest.value };
    newRequest.id = Date.now().toString();
    requests.value.push(newRequest);
    activeRequestIndex.value = requests.value.length - 1;
  }
}

// Execute the selected request type
async function executeRequest() {
  if (!client.value || !isConnected.value) {
    responseStatus.value = "Not connected to server";
    return;
  }

  cancelRequest();

  // Create a new abort controller for this request
  abortController = new AbortController();

  isExecuting.value = true;
  responseData.value = "";
  responseMetadata.value = {};
  responseStatus.value = "Running";
  streamMessages.value = [];

  try {
    const service = client.value.service<any>(currentRequest.value.service);
    const options: ServiceMethodOptions = {
      timeout: currentRequest.value.timeout,
      meta: parseMetadata(currentRequest.value.metadata),
      abort: abortController.signal
    };

    switch (currentRequest.value.methodType) {
      case "unary":
        await executeUnaryRequest(service, options);
        break;
      case "serverStream":
        await executeServerStreamRequest(service, options);
        break;
      case "clientStream":
        await executeClientStreamRequest(service, options);
        break;
      case "duplexStream":
        await executeDuplexStreamRequest(service, options);
        break;
    }
  } catch (error) {
    if (error instanceof MethodError) {
      responseStatus.value = `${Status[error.status]} (${error.status})`;
    } else {
      responseStatus.value = `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
    responseData.value = (error as Error).message;
    console.error("Request error:", error);
  } finally {
    isExecuting.value = false;
  }
}

// Execute Unary request
async function executeUnaryRequest(service: any, options: ServiceMethodOptions) {
  try {
    const response = (await service.unary(
      currentRequest.value.method,
      parseRequestData(currentRequest.value.data),
      options
    )) as UnaryResponse<any>;

    responseData.value = response.response ? JSON.stringify(response.response, null, 2) : "void";
    responseMetadata.value = response.meta ?? {};
    responseStatus.value = `Status: ${Status[response.status]} (${response.status})`;
  } catch (error) {
    throw error;
  }
}

// Execute Server Stream request
async function executeServerStreamRequest(service: any, options: ServiceMethodOptions) {
  try {
    const stream = service.serverStream(
      currentRequest.value.method,
      parseRequestData(currentRequest.value.data),
      options
    ) as IServerStream<any>;

    stream.onMessage((data: any) => {
      streamMessages.value.push(JSON.stringify(data));
    });

    stream.onEnd((result) => {
      responseStatus.value = `Stream Ended: ${Status[result.status]} (${result.status})`;
      responseMetadata.value = result.meta ?? {};
    });

    stream.onError((error: Error) => {
      responseStatus.value = `Stream Error: ${
        error instanceof MethodError ? `${Status[error.status]} (${error.status}) - ${error.message}` : error.message
      }`;
    });

    currentStream.value = stream;
  } catch (error) {
    throw error;
  }
}

// Execute Client Stream request
async function executeClientStreamRequest(service: any, options: ServiceMethodOptions) {
  try {
    const stream = service.clientStream(currentRequest.value.method, options) as IClientStream<any, any>;
    currentStream.value = stream;
  } catch (error) {
    throw error;
  }
}

// Complete Client Stream or Duplex Stream
async function completeStream() {
  if (!currentStream.value || !("complete" in currentStream.value)) return;

  try {
    const result = await (currentStream.value as IClientStream<any, any> | IDuplexStream<any, any>).complete();
    responseStatus.value = `Stream Completed: ${Status[result.status]} (${result.status})`;
    responseData.value = result.response ? JSON.stringify(result.response, null, 2) : "void";
    responseMetadata.value = result.meta ?? {};
  } catch (error) {
    if (error instanceof MethodError) {
      responseStatus.value = `Complete Error: ${Status[error.status]} (${error.status}) - ${error.message}`;
    } else {
      responseStatus.value = `Complete Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

// Execute Duplex Stream request
async function executeDuplexStreamRequest(service: any, options: ServiceMethodOptions) {
  try {
    const stream = service.duplex(currentRequest.value.method, options) as IDuplexStream<any, any>;
    stream.onMessage((data) => streamMessages.value.push(JSON.stringify(data)));
    stream.onEnd((result) => {
      responseStatus.value = `Stream Ended: ${Status[result.status]} (${result.status})`;
      responseMetadata.value = result.meta ?? {};
    });
    stream.onError(
      (error: Error) =>
        (responseStatus.value = `Stream Error: ${
          error instanceof MethodError ? `${Status[error.status]} (${error.status}) - ${error.message}` : error.message
        }`)
    );

    currentStream.value = stream;
  } catch (error) {
    throw error;
  }
}

// Send message to stream
async function sendStreamMessage() {
  if (!currentStream.value || !streamInput.value) return;

  try {
    if ("send" in currentStream.value) {
      await (currentStream.value as IClientStream<any, any> | IDuplexStream<any, any>).send(parseRequestData(streamInput.value));
      streamInput.value = "";
    }
  } catch (error) {
    responseStatus.value = `Send Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Helper to parse request data
function parseRequestData(data?: string): any {
  try {
    return JSON.parse(data || currentRequest.value.data);
  } catch {
    return data || currentRequest.value.data;
  }
}

// Helper to parse metadata
function parseMetadata(metadata: string): Record<string, string> {
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}
</script>

<style>
:root {
  /* Light theme colors */
  --color-primary: #42b983;
  --color-primary-dark: #3aa876;
  --color-primary-light: #e8f5e9;
  --color-error: #e74c3c;
  --color-success: #2ecc71;
  --color-warning: #f39c12;
  --color-info: #3498db;
  --color-text: #2c3e50;
  --color-text-secondary: #666;
  --color-text-inverted: #ffffff;

  /* Background colors */
  --color-background: #f9f9f9;
  --color-background-alt: #f0f2f5;
  --color-background-dark: #e9ecef;
  --color-surface: #ffffff;
  --color-surface-variant: #f5f5f5;
  --color-surface-hover: #f8f9fa;
  --color-surface-active: #e9ecef;
  --color-surface-highlight: #e3f2fd;
  --color-surface-warning: #fff3e0;
  --color-surface-error: #ffebee;
  --color-surface-success: #e8f5e9;

  /* Border colors */
  --color-border: #ddd;
  --color-border-light: #eee;
  --color-border-dark: #ccc;

  /* Code colors */
  --color-code-bg: #f0f0f0;
  --color-code-text: #333;
  --color-code-highlight: #fff9c4;

  /* Shadow colors */
  --color-shadow: rgba(0, 0, 0, 0.1);
  --color-shadow-strong: rgba(0, 0, 0, 0.2);

  /* Animation durations */
  --animation-duration: 0.3s;
  --animation-fast: 0.2s;
}

[data-theme="dark"] {
  /* Dark theme colors */
  --color-primary: #42b983;
  --color-primary-dark: #3aa876;
  --color-primary-light: #0e2a22;
  --color-error: #e74c3c;
  --color-success: #2ecc71;
  --color-warning: #f39c12;
  --color-info: #3498db;
  --color-text: #ecf0f1;
  --color-text-secondary: #bdc3c7;
  --color-text-inverted: #2c3e50;

  /* Background colors */
  --color-background: #2c3e50;
  --color-background-alt: #2c3e50;
  --color-background-dark: #252525;
  --color-surface: #2c3e50;
  --color-surface-variant: #34495e;
  --color-surface-hover: #3d566e;
  --color-surface-active: #2c3e50;
  --color-surface-highlight: #0e2a22;
  --color-surface-warning: #3e2723;
  --color-surface-error: #3e2723;
  --color-surface-success: #0e2a22;

  /* Border colors */
  --color-border: #3d566e;
  --color-border-light: #2c3e50;
  --color-border-dark: #4a6b8a;

  /* Code colors */
  --color-code-bg: #2c3e50;
  --color-code-text: #ecf0f1;
  --color-code-highlight: #4a4a4a;
}

body {
  color: var(--color-text);
  background-color: var(--color-background);
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  min-height: 100vh;
}

#app {
  max-width: initial;
}

.u-connect-tester {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: Arial, sans-serif;
  color: var(--color-text);
  background-color: var(--color-background);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: var(--color-surface-variant);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 2px 4px var(--color-shadow);
  position: relative;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.theme-toggle {
  margin-right: auto;
  margin-left: 10px;
}

.theme-toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: all var(--animation-fast);
}

.theme-toggle-btn:hover {
  background: var(--color-surface-hover);
}

.connection-status-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--color-error);
  color: var(--color-text-inverted);
  transition: all var(--animation-fast);
  position: relative;
  overflow: hidden;
}

.connection-status.connected {
  background: var(--color-success);
}

.connection-status.connecting {
  background: var(--color-info);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-inverted);
  transition: all var(--animation-fast);
}

.status-dot.connected {
  background: var(--color-success);
}

.status-dot.connecting {
  background: var(--color-info);
  animation: pulse var(--animation-duration) infinite;
}

.connection-animation {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-info);
  animation: pulse var(--animation-duration) infinite;
}

.pulse-dot:nth-child(1) {
  animation-delay: 0s;
}

.pulse-dot:nth-child(2) {
  animation-delay: 0.1s;
}

.pulse-dot:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}

.disconnect-btn {
  width: 100%;
  padding: 8px;
  background: var(--color-error);
  color: var(--color-text-inverted);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 8px;
  transition: all var(--animation-fast);
}

.disconnect-btn:hover {
  background: #c0392b;
}

.main-container {
  overflow: hidden;
  display: grid;
  flex: 1;
  grid-template-columns: 1fr 2fr;
}

/* Rest of the styles remain the same */
.sidebar {
  background: var(--color-surface-variant);
  border-right: 1px solid var(--color-border);
  padding: 15px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.connection-form {
  margin-bottom: 20px;
}

.connection-form .form-group {
  margin-bottom: 10px;
}

.connection-form label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--color-text-secondary);
}

.connection-form input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all var(--animation-fast);
}

.connection-form input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.connection-form button {
  width: 100%;
  padding: 8px;
  background: var(--color-primary);
  color: var(--color-text-inverted);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all var(--animation-fast);
}

.connection-form button:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.connection-form button:disabled {
  background: var(--color-border);
  cursor: not-allowed;
}

.request-list {
  flex: 1;
}

.request-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.request-list-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text);
}

.request-actions button {
  background: var(--color-primary);
  color: var(--color-text-inverted);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--animation-fast);
}

.request-actions button:hover {
  background: var(--color-primary-dark);
}

.request-items {
  overflow-y: auto;
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 5px;
  background: var(--color-surface);
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--color-border-light);
  color: var(--color-text);
  transition: all var(--animation-fast);
}

.request-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.request-item:hover {
  background: var(--color-surface-hover);
}

.request-info {
  flex: 1;
}

.request-method {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 3px;
}

.request-name {
  font-weight: bold;
  color: var(--color-text);
}

.request-item-actions {
  display: flex;
  gap: 5px;
}

.request-item-actions button {
  background: var(--color-surface-variant);
  color: var(--color-text-secondary);
  border: none;
  border-radius: 4px;
  width: 25px;
  height: 25px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--animation-fast);
}

.request-item-actions button:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 15px;
  padding-right: 0;
  padding-bottom: 0;
  background-color: var(--color-background-alt);
}

.request-config {
  background: var(--color-surface);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 4px var(--color-shadow);
  transition: all var(--animation-fast);
}

.request-header {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  flex: 1;
  margin-bottom: 10px;
}

.form-group.inline {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all var(--animation-fast);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.form-group textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all var(--animation-fast);
}

.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.request-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.request-actions button {
  padding: 10px 20px;
  color: var(--color-text-inverted);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--animation-fast);
  box-shadow: 0 2px 5px var(--color-shadow);
  position: relative;
  overflow: hidden;
}

.btn-icon {
  font-size: 1.1em;
}

.btn-text {
  font-size: 0.95em;
}

/* Save button styles */
.save-btn {
  background: linear-gradient(135deg, var(--color-primary), #2c9f67);
  border: 1px solid var(--color-primary-dark);
}

.save-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2c9f67, #1a7d4d);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--color-shadow-strong);
}

/* Execute button styles */
.execute-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
  border: 1px solid #2573a6;
}

.execute-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2980b9, #1f618d);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--color-shadow-strong);
}

.execute-btn:disabled {
  background: var(--color-border);
  color: var(--color-text-secondary);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Cancel button styles */
.cancel-btn {
  background: linear-gradient(135deg, var(--color-error), #c0392b);
  border: 1px solid #a82f23;
}

.cancel-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #c0392b, #99291d);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--color-shadow-strong);
}

.response-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  box-shadow: 0 2px 4px var(--color-shadow);
}

.response-tabs {
  display: flex;
  gap: 5px;
  padding: 10px;
  background: var(--color-surface-variant);
  border-bottom: 1px solid var(--color-border);
}

.response-tabs button {
  padding: 8px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  color: var(--color-text-secondary);
  transition: all var(--animation-fast);
}

.response-tabs button:hover {
  color: var(--color-text);
}

.response-tabs button.active {
  background: var(--color-surface);
  border-bottom: 2px solid var(--color-primary);
  color: var(--color-text);
  font-weight: bold;
}

.response-status {
  margin-left: auto;
  margin-right: 0;
}

.response-content {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  background-color: var(--color-surface);
}

.response-tab {
  height: 100%;
}

.response-tab pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: var(--color-code-bg);
  color: var(--color-code-text);
  padding: 10px;
  border-radius: 4px;
  transition: all var(--animation-fast);
}

.stream-messages {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 10px;
  padding: 10px;
  background: var(--color-surface);
  border-radius: 4px;
  border: 1px solid var(--color-border-light);
}

.stream-message {
  padding: 8px;
  margin-bottom: 8px;
  background: var(--color-code-bg);
  border-radius: 4px;
  word-break: break-all;
  color: var(--color-code-text);
  transition: all var(--animation-fast);
}

.stream-message:hover {
  background: var(--color-code-highlight);
}

.stream-input {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.stream-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all var(--animation-fast);
}

.stream-input input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.stream-input button {
  padding: 8px 15px;
  background: var(--color-primary);
  color: var(--color-text-inverted);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--animation-fast);
}

.stream-input button:hover {
  background: var(--color-primary-dark);
}

.complete-btn {
  background: var(--color-warning);
}

.status-codes-sidebar {
  width: 300px;
  background: var(--color-surface-variant);
  border-left: 1px solid var(--color-border);
  padding: 15px;
  overflow-y: auto;
  color: var(--color-text);
}

.status-codes-sidebar h3 {
  margin-top: 0;
  color: var(--color-text);
}

.status-codes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-code {
  padding: 10px;
  background: var(--color-surface);
  border-radius: 4px;
  border-left: 4px solid var(--color-primary);
  font-size: 0.9rem;
  color: var(--color-text);
  transition: all var(--animation-fast);
}

.status-code:hover {
  background: var(--color-surface-hover);
}

.status-code .code {
  font-weight: bold;
  color: var(--color-primary);
}
</style>
