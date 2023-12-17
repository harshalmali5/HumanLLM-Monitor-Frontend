import { NodeType } from "../nodes/NodeData";

export interface INodeData {
    choice: number;
    prompt: string;
    render(): string;
    changeChoice(choice: number): void;
    setPrompt(prompt: string): void;
    type: NodeType;
    color?: string;
}
