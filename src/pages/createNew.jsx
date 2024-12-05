import {useState} from 'react'
import createTask from '../data/createTask.json'

const CreateNew = () => {
    const [stage, setStage] = useState(0)
    const [options, setOptions] = useState(createTask[createTask["order"][0]]["options"])
    const [title, setTitle] = useState(createTask[createTask["order"][0]]["title"])

    const handleOptionClick = (option) => {
        // Can define things here later to only allow certain routes
        if (option) {
            setStage(stage + 1)
            setOptions(createTask[createTask["order"][stage]]["options"])
            setTitle(createTask[createTask["order"][stage]]["title"])
        }
    }

    return (
            <div>
                <h1 className="title">Create new task</h1>
                <section className="block">
                    <h2 className="subtitle">{title }</h2>
                    <div className="tags mt-5">
                        {options.map((option, index) => (
                            <button key={index} className="tag is-large has-border is-light" onClick={() => handleOptionClick(option) }>{option}</button>
                        ))}
                    </div>
                </section>
        </div>
    )
}

export default CreateNew