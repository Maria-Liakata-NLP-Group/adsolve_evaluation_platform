const ExampleModal = ({ gold, llm, onClickFunction, active}) => {
    return (
            <div className={`modal ${active ? "is-active" : ""}`}>
                <div className="modal-background"></div>
                <div className="modal-content is-flex">
                    <div className="has-background-white p-2 m-2 is-rounded is-flex-grow-1"
                        style={{overflowX: "scroll"}}>
                        <h2 className="subtitle">Gold</h2>
                        {gold}
                    </div>
                    <div className="has-background-white p-2 m-2 is-rounded is-flex-grow-1"
                        style={{overflowX: "scroll"}}
                    >
                        <h2 className="subtitle">LLM</h2>
                        {llm}
                    </div> 
                </div>
            <button onClick={onClickFunction} className="modal-close is-large" aria-label="close"></button>
        </div>
    )
}

export default ExampleModal;