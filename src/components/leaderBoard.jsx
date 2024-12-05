import {useEffect} from 'react';

const LeaderBoard = ({aspect, metric, values, tags}) => {

    useEffect(() => {
        console.log(aspect, metric, values, tags)
    }, [aspect, metric, values, tags])

    return (
        <div className="cell">
            {/* <h1>Leaderboard</h1> */}
            <h2 className="subtitle">{aspect}</h2>
            <b>Metric: </b> {metric}
            <div className="has-border has-rounded p-5">
                <ul>
                    {
                        values.map((value, index) => (
                            <li key={index}>
                                <progress className="progress is-large" value={value} max="100">{value}%</progress>
                                <span>{tags[index]}</span>
                                
                            </li>
                        ))
                    }
                </ul>
            </div>
        </div>
    );

}

export default LeaderBoard