import { gql } from '@apollo/client';

// Auth queries and mutations
export const SIGNUP_MUTATION = gql`
  mutation Signup($userData: UserCreateInput!) {
    signup(userData: $userData) {
      accessToken
      tokenType
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($credentials: UserLoginInput!) {
    login(credentials: $credentials) {
      accessToken
      tokenType
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($userUpdate: UserUpdateInput!) {
    updateProfile(userUpdate: $userUpdate) {
      id
      email
      fullName
      avatarUrl
      createdAt
      updatedAt
    }
  }
`;

export const GET_ME_QUERY = gql`
  query GetMe {
    me {
      id
      email
      fullName
      avatarUrl
      createdAt
      updatedAt
    }
  }
`;

// Experiment queries and mutations
export const GET_EXPERIMENTS_QUERY = gql`
  query GetExperiments($status: String) {
    experiments(status: $status) {
      id
      userId
      ideaText
      questionText
      status
      title
      personaCount
      resultsSummary
      recommendedNextStep
      createdAt
      updatedAt
    }
  }
`;

export const GET_EXPERIMENT_QUERY = gql`
  query GetExperiment($id: ID!) {
    experiment(id: $id) {
      id
      userId
      ideaText
      questionText
      status
      title
      personaCount
      resultsSummary
      recommendedNextStep
      createdAt
      updatedAt
    }
  }
`;

export const RUN_SIMULATION_MUTATION = gql`
  mutation RunSimulation($experimentData: ExperimentCreateInput!) {
    runSimulation(experimentData: $experimentData) {
      experimentId
      status
      totalProcessed
      totalPersonas
      sentimentBreakdown
      propertyDistributions
      recommendation
      title
    }
  }
`;

// Persona queries and mutations
export const GET_PERSONA_GROUPS_QUERY = gql`
  query GetPersonaGroups {
    personaGroups
  }
`;

export const GET_PERSONAS_BY_GROUP_QUERY = gql`
  query GetPersonasByGroup($personaGroup: String!) {
    personasByGroup(personaGroup: $personaGroup) {
      id
      userId
      generationJobId
      personaName
      personaData
      createdAt
      updatedAt
    }
  }
`;

export const GENERATE_CUSTOM_COHORT_MUTATION = gql`
  mutation GenerateCustomCohort($cohortData: PersonaGenerationJobCreateInput!) {
    generateCustomCohort(cohortData: $cohortData) {
      id
      userId
      audienceDescription
      personaGroup
      shortDescription
      source
      status
      personasGenerated
      totalPersonas
      errorMessage
      createdAt
      updatedAt
    }
  }
`;

// Chat mutations
export const CHAT_WITH_PERSONA_MUTATION = gql`
  mutation ChatWithPersona($conversationId: ID!, $personaId: ID!, $message: String!) {
    chatWithPersona(conversationId: $conversationId, personaId: $personaId, message: $message) {
      message
      conversationId
    }
  }
`;
