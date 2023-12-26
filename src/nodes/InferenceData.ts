import { NodeType } from "./node-types";

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

export enum NodeError {
    None = 0,
    FirstIsNotCoach = 1,
    LastIsNotCapitalizer = 2,
    NotCoder = 3,
    Cyclic = 4,
}

export class InferenceNodeData {
    readonly id: string;
    readonly error: NodeError;
    readonly type: NodeType;
    public setError: (error: NodeError) => void;
    public setBorderCss: (css: string) => void;

    /// error , setError
    /// should always be procured from useState
    constructor(
        id: string,
        type: NodeType,
        error: NodeError, setError: (_: NodeError) => void,
        setBorderCss: (_: string) => void,
    ) {
        this.error = error;
        this.setError = setError;
        this.setBorderCss = setBorderCss;
        this.type = type;
        this.id = id;
    }

    deleteSelf(deleteNodeGlobal: (_: string) => void, deleteNode: (_: string) => void) {
        deleteNode(this.id);
        deleteNodeGlobal(this.id);
    }
}
