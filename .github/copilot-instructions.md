<!-- Short, practical guidance for AI coding agents working on this repo -->
# Copilot instructions — LLM-college-simulator-bachelor

目标：让自动化编码/编辑代理能快速理解本仓库的架构、构建/调试流程、以及常见代码改动点。

- 快速命令
  - 安装 & 构建 & 运行（在仓库根的 `LLM-college-simulator-bachelor` 目录）：
    ```bash
    npm install
    npm run build && npm start
    ```
    服务器默认在 http://localhost:8000，静态产物输出到 `dist/`。

- 项目“为什么这样组织” — 大局
  - 这是一个以 TypeScript 编写、用 Webpack 打包的浏览器文本游戏引擎（前端 bundle 被放到 `dist/` 并由 `app.js` 用 `express` 提供静态文件）。
  - 配置与数据（事件、属性、物品、语言、GUI）以 YAML 存放在 `static/rulesets/default/`，运行时由 `GameEngine` 与 `GameEventLoader` 加载。
  - 关键运行路径：`static/index.html` 提供 `app_config` JSON -> `src/app.ts` 读取并构造 `GameEngine`、`GuiGameWindow`，然后进入主循环 (tick)。

- 关键组件及文件（优先阅读）
  - 程序入口/服务： `app.js`, `static/index.html`。
  - 启动与 GUI 构造： `src/app.ts`。
  - 中央逻辑： `src/gameEngine.ts`（registries、event engine、变量/状态/背包、随机源、tick 循环）。
  - 事件系统： `src/event/engine.ts`, `src/event/loader.ts`, `src/event/actions.ts`, `src/event/conditions.ts`, `src/event/expression.ts`。
  - GUI： `src/gui/`（尤其 `src/gui/guiGame.ts` 和 `src/gui/textEngine.ts`）。
  - 数据定义（YAML）： `static/rulesets/default/*.yaml`（`events.yaml`, `attributes.yaml`, `items.yaml`, `lang.yaml`, `gui.yaml`, `status.yaml`）
  - 国际化： `src/i18n/localization.ts` 与 `static/rulesets/default/lang.yaml`。

- 项目约定 & 可复用模式（针对修改建议）
  - 增加 / 修改事件：编辑 `static/rulesets/default/events.yaml`，事件会被 `GameEventLoader` 解析并注册到 `GameEventEngine`。
  - 新的事件动作/条件：实现或扩展类于 `src/event/actions.ts` / `src/event/conditions.ts`，并在 `GameEngine._initFactories()`（`src/gameEngine.ts`）中注册反序列化器。
  - 注册表模式：属性、物品、状态使用 Registry（见 `src/effect/` 下的 `attribute.ts`, `item.ts`, `status.ts`）。新增概念通常需要同时更新 registry 的加载逻辑和使用处。
  - 本地化键：规则文件中使用未本地化字符串键（unlocalizedName/unlocalizedDescription 等）。可以用 `App._dumpDebugInfo()`（在 `src/app.ts`）来收集/打印需要/缺失的翻译键。

- 调试与开发提示
  - Webpack 配置 `webpack.config.js`：开发模式、`devtool: 'source-map'`，打包 `src/app.ts` 到 `dist/app.bundle.js`，CopyPlugin 会把 `static/` 复制到 `dist/`。因此本地调试时请使用浏览器打开 `http://localhost:8000`。
  - 设置随机种子以重现：在地址栏 hash 中加入 `init_seed`，例如 `http://localhost:8000/#?init_seed=12345` 或 `http://localhost:8000/#init_seed=12345`（`src/app.ts` 解析 hash 并把它传入 `GameConfig.initialRandomSeed`）。
  - 输出/收集翻译键：把 `debugConfig.dumpTranslationKeys` 设置到 `app_config` JSON（见 `static/index.html`）以打印所需/缺失/多余的翻译键。

- 修改/新增代码的具体示例
  - 添加新动作示例流程：
    1. 在 `src/event/actions.ts` 中实现动作类（遵循现有 `EAXxx` 实现风格）。
    2. 在 `src/gameEngine.ts::_initFactories()` 中增加 `this._actionFactory.registerDeserializer(YourNewActionClass);`。
    3. 在 `static/rulesets/default/events.yaml` 中使用新的动作类型。
  - 添加新 GUI 控件：修改或扩展 `src/gui/guiGame.ts` / 相关 `gui*` 文件，并调整 `gui.yaml` 中的定义。

### LLM / AI 集成模板

项目内已添加示例文件（可直接参考或复制）：

- `src/llm/llmProvider.ts` — LLM 抽象接口 `ILLMProvider`，包含 `MockLLMProvider` 和 `FetchLLMProvider`；并提供 `getGlobalLLMProvider()` / `setGlobalLLMProvider()` 以全局注册。
- `src/examples/ea_ask_llm.ts` — 示例事件动作：使用 `window.prompt()` 获取玩家输入，将输入与模板合并后调用 `getGlobalLLMProvider().generate()`，并把 LLM 回复通过 `actionProxy.displayMessage()` 展示。
- `static/rulesets/default/events_template.yaml` — YAML 示例已包含一个普通事件模板；你可以复制并修改为使用 `AskLLM`（见下面示例）。

快速使用步骤：
1. 在 `src/gameEngine.ts::_initFactories()` 中注册示例动作：
  ```ts
  import { EAAskLLM } from './examples/ea_ask_llm';
  this._actionFactory.registerDeserializer(EAAskLLM);
  ```
2. 将一个实际的 `ILLMProvider` 注册为全局提供者，例如在 `src/app.ts` 的初始化阶段：
  ```ts
  import { setGlobalLLMProvider, FetchLLMProvider } from './llm/llmProvider';
  setGlobalLLMProvider(new FetchLLMProvider('/api/llm'));
  ```
  注意：不要在客户端硬编码真实 API Key；建议通过后端代理来调用第三方 LLM。
3. 在 `static/rulesets/default/events.yaml` 中使用动作：
  ```yaml
  - id: example.ask_ai
    trigger: Tick
    actions:
     - id: AskLLM
      prompt: "events.ask_ai_prompt"
      confirm: "OK"
  ```

注意与扩展：
- 当前示例使用 `window.prompt()` 做快速输入；若需要更好的 UX，应在 `src/gui/` 中添加输入控件（例如在 `GuiMessageWindow` 增加 `displayInput()`），并让 `GameActionProxy` 表面支持 `displayInput()`。
- `FetchLLMProvider` 预期后端返回 `{ text: string }` 或直接返回字符串。可根据实际后端调整解析逻辑。


- 常见坑 / 注意事项
  - 修改 YAML 后需重新运行 `npm run build`（或确保 `dist/` 被更新），因为运行时读取的是打包后 `dist/rulesets/...` 下的文件。
  - 事件注册有“disabledByDefault/once/exclusions”等行为，直接修改事件行为时请检查 `src/event/engine.ts` 的处理逻辑。
  - 如果添加序列化/反序列化新类型，确保工厂注册顺序与 `EventActionFactory`/`EventConditionFactory` 的注册保持一致。

- 资料与下一步
  - 首次要读：`src/app.ts` -> `src/gameEngine.ts` -> `src/event/engine.ts` -> `static/rulesets/default/`。
  - 我已把这份说明添加到 `.github/copilot-instructions.md`，需要我把内容合并到仓库（创建 PR / 直接提交）吗？

请告诉我哪些部分需要更详细的示例（例如：完整的“新增动作”代码模板或具体的 YAML 片段），我会立刻补充。 

## 代码模版（可复制粘贴）

下面给出一个最小的新动作（EventAction）模板，演示如何：
- 使用 `TranslationKeySource` 来定义可本地化的 message 字段；
- 在 `fromJSONObject()` 中使用 `context` 来编译表达式或创建嵌套对象；
- 在 `execute()` 中与 `actionProxy` / `variableStore` / `evaluator` 交互；
- 在 `GameEngine._initFactories()` 中注册反序列化器（见示例注释）。

```typescript
// src/examples/new_action_template.ts
import { EventAction, EventActionExecutionContext, EventActionResult } from '../event/core';
import { CompiledEventExpression } from '../event/expression';
import { TranslationKeySource } from '../event/translationKeySource';

/**
 * 示例动作：显示一条本地化消息，并可选地运行一个表达式结果赋值到变量。
 * JSON schema 示例：
 * {
 *   "id": "MyAction",
 *   "message": "events.my_action",                    // TranslationKeySourceDefinition
 *   "setVariable": "score = score + 1"              // 可选，表达式字符串
 * }
 */
export class EAMyAction extends EventAction {

  static ID = 'MyAction';

  constructor(private _message: TranslationKeySource,
        private _setVarExpr?: CompiledEventExpression,
        private _confirmText: string = 'OK') {
    super();
  }

  static fromJSONObject(obj: any, context: any): EAMyAction {
    if (obj['message'] == undefined) throw new Error('message missing');
    // 使用 TranslationKeySourceFactory 创建 message
    const message = context.translationKeySourceFactory.fromObject(obj['message']);
    let setVarExpr: CompiledEventExpression | undefined = undefined;
    if (obj['setVariable'] != undefined) {
      // 编译表达式（表达式可读写变量）
      setVarExpr = context.expressionCompiler.compile(obj['setVariable']);
    }
    return new EAMyAction(message, setVarExpr, obj['confirm'] || 'OK');
  }

  execute(context: EventActionExecutionContext): EventActionResult | Promise<EventActionResult> {
    // 展示消息（使用 translation key）
    return context.actionProxy.displayMessage(
      this._message.getTranslationKey(context),
      this._confirmText
    ).then(() => {
      // 可选：在消息关闭后执行表达式并把结果写入变量（示范）
      if (this._setVarExpr) {
        // 评估表达式（注意：表达式应当返回一个数值或可被赋值）
        const newValue = context.evaluator.eval(this._setVarExpr);
        // 这里示例把表达式结果写入名为 'lastExprResult' 的变量
        context.variableStore.setVar('lastExprResult', Number(newValue));
      }
      return EventActionResult.Ok;
    });
  }

  collectTranslationKeys(): ReadonlySet<string> {
    return this._message.collectTranslationKeys();
  }

}

/*
 使用此模板时：
 1) 把类文件放在合适位置（例如本示例的 `src/examples/`），
 2) 在 `src/gameEngine.ts::_initFactories()` 中加入：
    this._actionFactory.registerDeserializer(EAMyAction);
 3) 在 `static/rulesets/default/events.yaml` 中以下列方式使用：
 */
```

```yaml
# static/rulesets/default/events_template.yaml
- id: example.my_action_event
  trigger: Tick
  probability: 1.0
  conditions: []
  actions:
  - id: MyAction
    message: "events.my_action_message"
    setVariable: "score = (score || 0) + 1"
```

说明：
- `message` 可以是字符串、数组、权重对象或 conditional 对象（参见 `src/event/translationKeySource.ts`），在 `fromJSONObject()` 中用 `context.translationKeySourceFactory.fromObject()` 构造。
- `setVariable` 示例演示如何把表达式编译并在执行时通过 `context.evaluator.eval()` 计算。

如果你想，我可以把上述 TS 模板放到 `src/event/` 下并自动在 `GameEngine._initFactories()` 注册，从而立即可被 YAML 使用。 
