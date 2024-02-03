export const stringifyError = (error: NodeError) => {
    switch (error) {
        case NodeError.None:
            return "";
        case NodeError.Cyclic:
            return "Cyclic";
        case NodeError.FirstIsNotCoach:
            return "First is not Coach";
        case NodeError.LastIsNotCapitalizer:
            return "Last is not Capitalizer";
        case NodeError.NotCoder:
            return "Not Coder";
        case NodeError.BeforeThenAfter:
            return "Before then after";
        case NodeError.TwoAfter:
            return "Two after in a row";
        case NodeError.TwoBefore:
            return "Two before in a row";
        default:
            return "";
    }
};


export enum NodeError {
    None = 0,
    FirstIsNotCoach = 1,
    LastIsNotCapitalizer = 2,
    NotCoder = 3,
    Cyclic = 4,
    BeforeThenAfter = 5,
    TwoAfter = 6,
    TwoBefore = 7,
}