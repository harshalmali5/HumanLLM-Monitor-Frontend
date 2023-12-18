import { NodeType } from "./NodeData";

export enum AfterChoice {
    ModifyAnswer = 1,
    CriticAnswer = 2,
    FindBetterPrompt = 3,
    EvalAnswer = 4,
}

export enum BeforeChoice {
    ModifyPrompt = 1,
    AddPrompt = 2,
    SkipInference = 3,
    LogComment = 4,
    UsePremiumLLM = 5,
}

export class AfterBeforeData {
    readonly id: string;
    readonly choice: AfterChoice | BeforeChoice;
    readonly prompt: string;
    readonly error: boolean;
    
    readonly type: NodeType;
    public setPrompt: (prompt: string) => void;
    public changeChoice: (choice: AfterChoice) => void;
    public setError: (error: boolean) => void;

    /// choice, changeChoice, prompt and setPrompt
    /// should always be is procured from useState
    constructor(
        id: string,
        type: NodeType, choice: AfterChoice, changeChoice: (_: AfterChoice) => void,
        prompt: string, setPrompt: (_: string) => void,
            error: boolean, setError: (_: boolean) => void,
        ) {
        this.choice = choice;
        this.changeChoice = changeChoice;
        this.prompt = prompt;
        this.setPrompt = setPrompt;
        this.error = error;
        this.setError = setError;
        this.type = type;
        this.id = id;
    }

    render() {
        switch (this.choice) {
            case AfterChoice.ModifyAnswer:
                return "Modify Answer";
            case AfterChoice.CriticAnswer:
                return "Critic Answer";
            case AfterChoice.FindBetterPrompt:
                return "Find Better Prompt";
            case AfterChoice.EvalAnswer:
                return "Eval Answer";
            default:
                return "Unknown Choice";
        }
    }

    deleteSelf(deleteNodeGlobal: (_: string) => void, deleteNode: (_: string) => void) {
        deleteNode(this.id);
        deleteNodeGlobal(this.id);
    }
}
