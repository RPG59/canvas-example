// @ts-nocheck
import {
    createUserScenario,
    createSystemScenario,
    createSaluteRequest,
    createSaluteResponse,
    createScenarioWalker,
    createMatchers,
    SaluteRequest,
    NLPRequest,
    NLPResponse,
} from '@salutejs/scenario';
import { SaluteMemoryStorage } from '@salutejs/storage-adapter-memory';

import {
    addNote,
    deleteNote,
    deleteNoteApproved,
    deleteNoteCancelled,
    doneNote,
    getInitialNotes,
    noMatchHandler,
    runAppHandler,
} from './handlers';

const { action, regexp, text } = createMatchers<SaluteRequest>();

const userScenario = createUserScenario({
    Profile: {
        match: text('профиль'),
        handle: ({ res }) => {
            res.getProfileData();
        },
        children: {
            ProfileReceived: {
                match: (req) => req.request.messageName === 'TAKE_PROFILE_DATA',
                handle: ({ res, req }) => {
                    const name = req.profile?.customer_name;

                    if (name) {
                        res.setPronounceText(`Привет, ${name}`);

                        return;
                    }

                    if (req.request.messageName === 'TAKE_PROFILE_DATA') {
                        res.setPronounceText(
                            `Почему-то не получили ваше имя, статус ошибки ${req.request.payload.status_code.code}`,
                        );

                        return;
                    }

                    res.setPronounceText('До свидания');
                },
            },
        },
    },
    AddNote: {
        match: regexp(/^(записать|напомнить|добавить запись) (?<note>.+)$/i),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        handle: addNote,
    },
    DoneNote: {
        match: regexp(/^(выполнить?|сделать?) (?<note>.+)$/i, { normalized: false }),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        handle: doneNote,
    },
    DoneNoteAction: {
        match: action('done'),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        handle: doneNote,
    },
    GetInitialNotes: {
        match: action('notes'),
        handle: getInitialNotes,
    },
    DeleteNote: {
        match: regexp(/^(удалить) (?<note>.+)$/i),
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        handle: deleteNote,
        children: {
            yes: {
                match: regexp(/^(да|продолжить)$/i),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                handle: deleteNoteApproved,
            },
            no: {
                match: regexp(/^(нет|отменить)$/i),
                handle: deleteNoteCancelled,
            },
        },
    },
});

const scenarioWalker = createScenarioWalker({
    systemScenario: createSystemScenario({
        RUN_APP: runAppHandler,
        NO_MATCH: noMatchHandler,
    }),
    userScenario,
});

const storage = new SaluteMemoryStorage();

export const handleNlpRequest = async (request: NLPRequest): Promise<NLPResponse> => {
    const req = createSaluteRequest(request);
    const res = createSaluteResponse(request);

    const sessionId = request.uuid.userId;
    const session = await storage.resolve(sessionId);

    await scenarioWalker({ req, res, session });
    await storage.save({ id: sessionId, session });

    return res.message;
};
