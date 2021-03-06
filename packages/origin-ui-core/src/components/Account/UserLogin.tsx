import React from 'react';
import { showNotification, NotificationType } from '../../utils/notifications';
import {
    Paper,
    FormControl,
    Grid,
    Button,
    useTheme,
    makeStyles,
    createStyles
} from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Field, Form, FormikActions } from 'formik';
import { TextField } from 'formik-material-ui';
import { setLoading } from '../../features/general/actions';
import { FormInput } from '../Form/FormInput';
import { getOffChainDataSource } from '../../features/general/selectors';
import { setAuthenticationToken } from '../../features/users/actions';
import { useTranslation } from 'react-i18next';
import { useValidation } from '../../utils/validation';

interface IFormValues {
    email: string;
    password: string;
}

const INITIAL_FORM_VALUES: IFormValues = {
    email: '',
    password: ''
};

export function UserLogin() {
    const userClient = useSelector(getOffChainDataSource)?.userClient;
    const dispatch = useDispatch();

    const { t } = useTranslation();
    const { Yup, yupLocaleInitialized } = useValidation();

    const useStyles = makeStyles(() =>
        createStyles({
            container: {
                padding: '10px'
            }
        })
    );

    const classes = useStyles(useTheme());

    if (!yupLocaleInitialized) {
        return <Skeleton variant="rect" height={200} />;
    }

    const VALIDATION_SCHEMA = Yup.object().shape({
        email: Yup.string()
            .email()
            .label(t('user.properties.email'))
            .required(),
        password: Yup.string()
            .label(t('user.properties.password'))
            .required()
    });

    async function submitForm(
        values: typeof INITIAL_FORM_VALUES,
        formikActions: FormikActions<typeof INITIAL_FORM_VALUES>
    ): Promise<void> {
        formikActions.setSubmitting(true);
        dispatch(setLoading(true));

        try {
            const loginResponse = await userClient.login(values.email, values.password);

            dispatch(setAuthenticationToken(loginResponse.accessToken));

            showNotification(t('user.feedback.userLoggedIn'), NotificationType.Success);
        } catch (error) {
            console.warn('Could not log in.', error);
            showNotification(t('user.feedback.couldNotLogIn'), NotificationType.Error);
        }

        dispatch(setLoading(false));
        formikActions.setSubmitting(false);
    }

    const initialFormValues: IFormValues = INITIAL_FORM_VALUES;

    if (!userClient) {
        return <Skeleton variant="rect" height={200} />;
    }

    return (
        <Paper className={classes.container}>
            <Formik
                initialValues={initialFormValues}
                onSubmit={submitForm}
                validationSchema={VALIDATION_SCHEMA}
                isInitialValid={false}
            >
                {formikProps => {
                    const { isValid, isSubmitting } = formikProps;

                    const fieldDisabled = isSubmitting;
                    const buttonDisabled = isSubmitting || !isValid;

                    return (
                        <Form>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <FormInput
                                        label={t('user.properties.email')}
                                        property="email"
                                        disabled={fieldDisabled}
                                        className="mt-3"
                                        required
                                    />

                                    <FormControl
                                        fullWidth
                                        variant="filled"
                                        className="mt-3"
                                        required
                                    >
                                        <Field
                                            label={t('user.properties.password')}
                                            name="password"
                                            component={TextField}
                                            variant="filled"
                                            fullWidth
                                            required
                                            disabled={fieldDisabled}
                                            type="password"
                                        />
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                className="mt-3 right"
                                disabled={buttonDisabled}
                            >
                                {t('user.actions.login')}
                            </Button>
                        </Form>
                    );
                }}
            </Formik>
        </Paper>
    );
}
