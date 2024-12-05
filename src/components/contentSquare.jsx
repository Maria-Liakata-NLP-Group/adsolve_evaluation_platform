const ContentSquare = ({title, onClick}) => {
    return (
        <div className="cell p-2">
            <div 
                className="box has-border 
                            is-square 
                            is-flex 
                            is-justify-content-center 
                            is-align-items-center" 
                onClick={() => onClick()}
            >
                {title}
            </div>
        </div>
    );
}

export default ContentSquare