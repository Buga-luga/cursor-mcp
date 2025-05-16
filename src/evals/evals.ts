//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from "@ai-sdk/openai";
import { grade, EvalFunction } from "mcp-evals";

const open_cursorEval: EvalFunction = {
    name: 'open_cursor Evaluation',
    description: 'Evaluates the ability to open a new Cursor IDE instance and return its ID',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please open a new Cursor IDE instance in the workspace path /home/user/myProject and return the instance ID.");
        return JSON.parse(result);
    }
};

const cursor_commandEval: EvalFunction = {
    name: 'cursor_commandEval',
    description: 'Evaluates executing a command in a specific Cursor IDE instance',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please execute the command 'echo Hello from Cursor IDE' in the Cursor instance with ID 'abcd-1234'.");
        return JSON.parse(result);
    }
};

const open_cline_tabEval: EvalFunction = {
    name: 'open_cline_tab Evaluation',
    description: 'Evaluates the functionality of the open_cline_tab tool by opening a new Cline tab in a specific Cursor instance',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please open a new Cline tab for Cursor instance with ID 1234");
        return JSON.parse(result);
    }
};

const cursorCommandToolEval: EvalFunction = {
    name: "Cursor Command Tool Evaluation",
    description: "Tests the functionality of the cursor_command tool",
    run: async () => {
        const result = await grade(openai("gpt-4"), "Please open the command palette in the Cursor instance with ID 'test-instance' by calling the 'cursor_command' tool.");
        return JSON.parse(result);
    }
};

const openCursorEval: EvalFunction = {
    name: 'OpenCursorEval',
    description: 'Evaluates the open_cursor tool functionality',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Open a new cursor instance with the workspace path '/example/workspace'.");
        return JSON.parse(result);
    }
};

const config: EvalConfig = {
    model: openai("gpt-4"),
    evals: [open_cursorEval, cursor_commandEval, open_cline_tabEval, cursorCommandToolEval, openCursorEval]
};
  
export default config;
  
export const evals = [open_cursorEval, cursor_commandEval, open_cline_tabEval, cursorCommandToolEval, openCursorEval];