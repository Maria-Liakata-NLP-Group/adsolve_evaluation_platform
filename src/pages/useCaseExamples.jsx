import { useParams, useNavigate } from "react-router-dom";
import ContentSquare from "../components/contentSquare";

const content = {
    "useCase1": ["Example 1", "Example 2", "Example 3"],
    "useCase2": ["TalkLife", "AnnoMI", "Example 6", "Example 7", "Example 8"],
    "useCase3": ["Xingwei", "Example 10", "Example 11"],
}

const useCaseNames = {
    "useCase1": "Multi-modal medical diagnostics and monitoring",
    "useCase2": "AI support for mental health",
    "useCase3": "AI legal support",
}


const UseCaseExamples = () => {
    const { useCase } = useParams();

    const navigate = useNavigate();

    const onClick = (title) => navigate(`/use-cases/${useCase}/${title}`);

    return (            
    
            <section className="block">
                <div className="content">
                    <h2 className="subtitle">{useCaseNames[useCase]}</h2>
                    <p>THIS IS PLACEHOLDER TEXT FOR A DESCRIPTION Ipsum quis deserunt fugiat deserunt laboris velit. Et voluptate eiusmod deserunt enim cillum ea nulla adipisicing est voluptate voluptate exercitation magna. Eiusmod incididunt do deserunt adipisicing non anim. Aliquip tempor qui ipsum elit ea exercitation enim incididunt ex qui dolore minim. Velit occaecat occaecat Lorem voluptate eiusmod. Excepteur minim enim id Lorem id ea minim adipisicing ipsum nulla.</p>

                </div>
                <div className="m-5"></div>
                <div className="fixed-grid has-4-cols has-2-cols-mobile">
                    <div className="grid">
                    {
                        content[useCase].map((title) => {
                            return <ContentSquare title={title} onClick={() => onClick(title)} key={title}/>
                        })
                    }
                    </div>
                </div>
            </section>);
}

export default UseCaseExamples