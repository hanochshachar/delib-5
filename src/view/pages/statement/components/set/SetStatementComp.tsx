import { FC, useEffect, useState } from 'react';
import { StatementType } from '../../../../../model/statements/statementModel';
import { setStatmentToDB } from '../../../../../functions/db/statements/setStatments';
import { useNavigate, useParams } from 'react-router-dom';
import { auth } from '../../../../../functions/db/auth';
import { UserSchema } from '../../../../../model/users/userModel';
import Loader from '../../../../components/loaders/Loader';
import { useAppDispatch, useAppSelector } from '../../../../../functions/hooks/reduxHooks';
import { setStatement, statementSelector } from '../../../../../model/statements/statementsSlice';
import { getStatementFromDB } from '../../../../../functions/db/statements/getStatement';

import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { navArray } from '../nav/StatementNav';
import { NavObject, Screen, Statement } from 'delib-npm';

interface Props {
    simple?: boolean
    new?: boolean
}


export const SetStatementComp: FC<Props> = ({ simple }) => {
    const navigate = useNavigate();
    const { statementId } = useParams();
    const statement = useAppSelector(statementSelector(statementId));
    const dispatch = useAppDispatch();

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (statementId) {
            if (!statement)
                (async () => {
                    const statementDB = await getStatementFromDB(statementId);
                    if (statementDB) dispatch(setStatement(statementDB));
                })();

        }
    }, [statementId]);

    async function handleSetStatment(ev: React.FormEvent<HTMLFormElement>) {
        try {

            ev.preventDefault();
            setIsLoading(true);
            const data = new FormData(ev.currentTarget);
            console.log(data);
            console.log(data.keys());
            let title: any = data.get('statement');
            const description = data.get('description');
            //add to title * at the beggining
            if (title && !title.startsWith('*')) title = `*${title}`;
            const _statement = `${title}\n${description}`;
            const _user = auth.currentUser;
            if (!_user) throw new Error("user not found");
            const { displayName, email, photoURL, uid } = _user;
            const user = { displayName, email, photoURL, uid };
            UserSchema.parse(user);


            const newStatement: any = Object.fromEntries(data.entries());
            console.log(newStatement)

            newStatement.subScreens = parseScreensCheckBoxes(newStatement, navArray);
            newStatement.statement = _statement;
            newStatement.statementId = statement?.statementId || crypto.randomUUID();
            newStatement.creatorId = statement?.creator.uid || auth.currentUser?.uid;
            newStatement.parentId = statement?.parentId || statementId || "top";
            newStatement.type = statementId === undefined ? StatementType.GROUP : StatementType.STATEMENT;
            newStatement.creator = statement?.creator || user;
            if (statement) {
                newStatement.lastUpdate = new Date().getTime();
            }
            newStatement.createdAt = statement?.createdAt || new Date().getTime();

            newStatement.consensus = statement?.consensus || 0;

            const setSubsciption: boolean = statementId === undefined ? true : false;

            const _statementId = await setStatmentToDB(newStatement, setSubsciption);

            setIsLoading(false);

            if (_statementId)
                navigate(`/home/statement/${_statementId}`);

            else
                throw new Error("statement not found");
        } catch (error) {
            console.error(error);
        }
    }

    const arrayOfStatementParagrphs = statement?.statement.split('\n') || [];
    //get all elements of the array except the first one
    const description = arrayOfStatementParagrphs?.slice(1).join('\n');


    return (
        <div className='wrapper'>

            {!isLoading ? <form onSubmit={handleSetStatment} className='setStatement__form'>
                <label htmlFor="statement">כותרת</label>
                <input type="text" name="statement" placeholder='כותרת הקבוצה' defaultValue={arrayOfStatementParagrphs[0]} />
                <textarea name="description" placeholder='תיאור הקבוצה' defaultValue={description}></textarea>
                {!simple ? <section>

                    <label htmlFor="subPages">תת עמודים</label>
                    <FormGroup>
                        {navArray
                            .filter(navObj => navObj.link !== Screen.SETTINGS)
                            .map((navObj) =>
                                <FormControlLabel key={navObj.id} control={<Checkbox name={navObj.link} defaultChecked={isSubPageChecked(statement, navObj.link)} />} label={navObj.name} />
                            )}

                    </FormGroup>
                </section> : null}

                <div className="btnBox">
                    <button type="submit">{!statementId ? "הוספה" : "עדכון"}</button>
                </div>

            </form> :
                <div className="center">
                    <h2>מעדכן...</h2>
                    <Loader />
                </div>}
        </div>

    );
};

function isSubPageChecked(statement: Statement | undefined, screen: Screen) {
    try {
        if (!statement) return true;
        const subScreens = statement.subScreens as Screen[];
        if (subScreens === undefined) return true;
        if (subScreens?.includes(screen)) return true;
    } catch (error) {
        console.error(error);
        return true;
    }
}

function parseScreensCheckBoxes(dataObj: Object, navArray: NavObject[]) {
    try {
        if (!dataObj) throw new Error("dataObj is undefined");
        if (!navArray) throw new Error("navArray is undefined");
        const _navArray = [...navArray];

        const screens = _navArray
            //@ts-ignore
            .filter(navObj => dataObj[navObj.link] === "on")
            .map(navObj => navObj.link);
        return screens;
    } catch (error) {
        console.error(error);
        return [];
    }
}
