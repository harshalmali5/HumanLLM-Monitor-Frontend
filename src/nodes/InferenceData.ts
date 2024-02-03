import { NodeError } from "./error";

export enum InferenceNodeType {
    Coder = 1,
    Capitalizer = 2,
    Coach = 3,
    Validator = 4,
    Critic = 5,
};



export class InferenceNodeData {
    readonly id: string;
    readonly error: NodeError;
    readonly type: InferenceNodeType;
    readonly selected: boolean;
    public setError: (error: NodeError) => void;
    public setBorderCss: (css: string) => void;
    public setSelected: (selected: boolean) => void;

    /// error , setError
    /// should always be procured from useState
    constructor(
        id: string,
        type: InferenceNodeType,
        error: NodeError, 
        selected: boolean,
        setError: (_: NodeError) => void,
        setBorderCss: (_: string) => void,
        setSelected: (_: boolean) => void,
    ) {
        this.error = error;
        this.setError = setError;
        this.setBorderCss = setBorderCss;
        this.type = type;
        this.id = id;
        this.selected = selected;
        this.setSelected = setSelected;
    }

    deleteSelf(deleteNodeGlobal: (_: string) => void, deleteNode: (_: string) => void) {
        deleteNode(this.id);
        deleteNodeGlobal(this.id);
    }
}
