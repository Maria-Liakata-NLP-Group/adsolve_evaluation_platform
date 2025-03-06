const getScoreColour = (score) => {
    // fade from red to green
    const r = Math.floor(255 * (1 - score));
    const g = Math.floor(255 * score);
    return `rgb(${r}, ${g}, 0)`
}


const ExampleModal = ({ gold, llm_sents, llm_sent_scores, onClickFunction, active}) => {
    return (
            <div className={`modal ${active ? "is-active" : ""}`}>
                <div className="modal-background" onClick={onClickFunction}></div>
                <div className="modal-content is-flex"
                    style={{width: "80%"}}>
                    <div className="has-background-white p-4 m-2 is-rounded is-flex-grow-1"
                        style={{overflowX: "scroll", width: "50%"}}> 
                        <h2 className="subtitle">Gold</h2>
                        {gold}
                    </div>
                    <div className="has-background-white p-4 m-2 is-rounded is-flex-grow-1"
                        style={{overflowX: "scroll", width: "50%"}}
                    >
                        <h2 className="subtitle">LLM</h2>
                        {llm_sents?.map((sentence, index) => (
                            <span 
                                key={index}
                                style={{textDecoration: "underline", 
                                        textDecorationColor: getScoreColour(llm_sent_scores[index]),
                                        textDecorationThickness: "2px",
                                    }}
                            >
                                {sentence}{" "}
                            </span>
                        ))}
                    </div> 
                </div>
        </div>
    )
}

export default ExampleModal;