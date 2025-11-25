pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:18
    command: ["cat"]
    tty: true

  - name: docker
    image: docker:dind
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    args:
    - "--storage-driver=overlay2"
    volumeMounts:
    - name: workspace-volume
      mountPath: /home/jenkins/agent

  - name: sonar
    image: sonarsource/sonar-scanner-cli
    command: ["cat"]
    tty: true

  - name: jnlp
    image: jenkins/inbound-agent:3309.v27b9314fd1a4-1
    env:
    - name: JENKINS_AGENT_WORKDIR
      value: "/home/jenkins/agent"
    volumeMounts:
    - mountPath: "/home/jenkins/agent"
      name: workspace-volume

  volumes:
  - name: workspace-volume
    emptyDir: {}
"""
        }
    }

    environment {
        SONAR_PROJECT_KEY  = 'techfixer'
        SONAR_PROJECT_NAME = 'TechFixer'
        IMAGE_NAME         = 'techfixer-imcc'
    }

    stages {

        stage('Checkout') {
            steps {
                container('node') {
                    git branch: 'main',
                        url: 'https://github.com/KRISHNACHAUDHARI10/techfixer-imcc',
                        credentialsId: '454cc585-35c1-4a0c-93d6-ae7a37bcfb1e'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                container('node') {
                    sh 'npm install'
                }
            }
        }

        stage('Sonar Scan') {
            steps {
                container('sonar') {
                    withCredentials([string(credentialsId: 'sonar-token-techfixer', variable: 'SONAR_TOKEN')]) {
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

        stage('Docker Build') {
            steps {
                container('docker') {
                    sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} ."
                }
            }
        }

        stage('Package Artifact') {
            steps {
                container('node') {
                    sh "tar czf ${IMAGE_NAME}-${BUILD_NUMBER}.tar.gz ."
                }
            }
        }

        stage('Upload to Nexus') {
            steps {
                container('node') {
                    withCredentials([usernamePassword(
                        credentialsId: 'nexus-imcc',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )]) {
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
}
