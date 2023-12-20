import React from "react";

interface ModifyAnswerProps {
    setAnswer: (answer: string) => void;
    answer: string;
    final?: boolean;
}

const ModifyAnswer: React.FC<ModifyAnswerProps> = ({
    setAnswer,
    answer,
    final,
}: ModifyAnswerProps) => {
    return (
        <div className="modify-answer">
            <div className="text-2xl">{final ? "Final" : "Modify"} Answer</div>
            {final ? (
                <div className="text-xl">{answer}</div>
            ) : (
                <textarea
                    className="border-2 border-gray-200 rounded-md p-2"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                />
            )}
        </div>
    );
};

export default ModifyAnswer;
