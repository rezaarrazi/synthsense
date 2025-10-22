import { gql } from '@apollo/client';

// Auth queries and mutations
export const SIGNUP_MUTATION = gql`
  mutation Signup($userData: UserCreateInput!) {
    signup(userData: $userData) {
      accessToken
      tokenType
      user {
        id
        email
        fullName
        avatarUrl
        createdAt
        updatedAt
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($credentials: UserLoginInput!) {
    login(credentials: $credentials) {
      accessToken
      tokenType
      user {
        id
        email
        fullName
        avatarUrl
        createdAt
        updatedAt
      }
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($token: String!, $userUpdate: UserUpdateInput!) {
    updateProfile(token: $token, userUpdate: $userUpdate) {
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
  query GetMe($token: String!) {
    me(token: $token) {
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
  query GetExperiments($token: String!, $status: String) {
    experiments(token: $token, status: $status) {
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
  query GetExperiment($token: String!, $id: ID!) {
    experiment(token: $token, id: $id) {
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

export const GET_EXPERIMENT_RESPONSES_QUERY = gql`
  query GetExperimentResponses($token: String!, $experimentId: ID!) {
    experimentResponses(token: $token, experimentId: $experimentId) {
      id
      experimentId
      personaId
      userId
      responseText
      likert
      responseMetadata
      createdAt
      persona {
        id
        personaName
        personaData
        createdAt
        updatedAt
      }
    }
  }
`;

export const RUN_SIMULATION_MUTATION = gql`
  mutation RunSimulation($token: String!, $experimentData: ExperimentCreateInput!) {
    runSimulation(token: $token, experimentData: $experimentData) {
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

export const RUN_GUEST_SIMULATION_MUTATION = gql`
  mutation RunGuestSimulation($guestData: GuestSimulationInput!) {
    runGuestSimulation(guestData: $guestData) {
      experimentId
      status
      totalProcessed
      totalPersonas
      sentimentBreakdown
      propertyDistributions
      recommendation
      title
      personas
      responses
    }
  }
`;

export const SAVE_GUEST_SIMULATION_MUTATION = gql`
  mutation SaveGuestSimulation($token: String!, $guestData: SaveGuestSimulationInput!) {
    saveGuestSimulation(token: $token, guestData: $guestData) {
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

// Experiment mutations
export const DELETE_EXPERIMENT_MUTATION = gql`
  mutation DeleteExperiment($token: String!, $experimentId: ID!) {
    deleteExperiment(token: $token, experimentId: $experimentId)
  }
`;

export const UPDATE_EXPERIMENT_TITLE_MUTATION = gql`
  mutation UpdateExperimentTitle($token: String!, $experimentId: ID!, $title: String!) {
    updateExperimentTitle(token: $token, experimentId: $experimentId, title: $title) {
      id
      title
      updatedAt
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
  query GetPersonasByGroup($token: String!, $personaGroup: String!) {
    personasByGroup(token: $token, personaGroup: $personaGroup) {
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

export const DELETE_COHORT_MUTATION = gql`
  mutation DeleteCohort($personaGroup: String!) {
    deleteCohort(personaGroup: $personaGroup)
  }
`;


export const GET_CONVERSATION_MESSAGES_MUTATION = gql`
  mutation GetConversationMessages($token: String!, $conversationId: String!) {
    getConversationMessages(token: $token, conversationId: $conversationId) {
      id
      conversationId
      role
      content
      createdAt
    }
  }
`;

export const CHAT_WITH_PERSONA_MUTATION = gql`
  mutation ChatWithPersona($token: String!, $conversationId: String!, $personaId: String!, $message: String!) {
    chatWithPersona(token: $token, conversationId: $conversationId, personaId: $personaId, message: $message) {
      message
      conversationId
    }
  }
`;

export const CHAT_WITH_PERSONA_STREAM_MUTATION = gql`
  mutation ChatWithPersonaStream($token: String!, $conversationId: String!, $personaId: String!, $message: String!) {
    chatWithPersonaStream(token: $token, conversationId: $conversationId, personaId: $personaId, message: $message) {
      content
      conversationId
      isFinal
    }
  }
`;
