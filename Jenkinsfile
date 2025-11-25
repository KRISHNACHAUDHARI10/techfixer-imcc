pipeline {
    agent any

    environment {
        SONAR_PROJECT_KEY  = 'techfixer'
        SONAR_PROJECT_NAME = 'TechFixer'
        IMAGE_NAME         = 'techfixer-imcc'
    }

    stages {

        stage('CHECK') {
            steps {
                echo "TECHFIXER-IMCC NODE.JS PIPELINE STARTED"
                sh 'node -v || true'
                sh 'npm -v || true'
            }
        }

        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/KRISHNACHAUDHARI10/techfixer-imcc',
                    credentialsId: '454cc585-35c1-4a0c-93d6-ae7a37bcfb1e'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('SonarQube Scan') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    withCredentials([
                        string(credentialsId: 'sonar-token-techfixer', variable: 'SONAR_TOKEN')
                    ]) {
                        sh """
                            sonar-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.projectName=${SONAR_PROJECT_NAME} \
                              -Dsonar.sources=. \
                              -Dsonar.login=$SONAR_TOKEN \
                              -Dsonar.host.url=http://sonarqube.imcc.com
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} ."
            }
        }

        stage('Create tar.gz Artifact') {
            steps {
                sh "tar czf ${IMAGE_NAME}-${BUILD_NUMBER}.tar.gz ."
            }
        }

        stage('Upload Artifact to Nexus') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'nexus-imcc',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )
                ]) {
                    sh """
                        curl -v -u $NEXUS_USER:$NEXUS_PASS \
                        --upload-file ${IMAGE_NAME}-${BUILD_NUMBER}.tar.gz \
                        "http://nexus.imcc.com/repository/my-repository/${IMAGE_NAME}/${IMAGE_NAME}-${BUILD_NUMBER}.tar.gz"
                    """
                }
            }
        }
    }
}
