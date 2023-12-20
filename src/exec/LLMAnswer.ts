
export enum AnswerType {
    None = 0,
    Refined = 1,
    Default = 2,
}

export class LLMAnswer {
    readonly answer: string;
    readonly type: AnswerType = AnswerType.None;
    constructor(answer: string) {
        this.answer = answer;
    }
}
