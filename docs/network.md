# Anomaly Detection in Network Traffic Using UNSW-NB15 Dataset

## Project Overview

This project focuses on detecting anomalies in network traffic to identify potential cyber-attacks and malicious activities. Utilizing the UNSW-NB15 dataset, we aim to develop robust machine learning models capable of accurately distinguishing between normal and anomalous network behavior. By implementing and comparing various supervised learning algorithms, including Random Forest, XGBoost, LightGBM, and Neural Networks, we strive to enhance the effectiveness of intrusion detection systems and contribute to cybersecurity efforts.

## Dataset

The dataset used in this project is the [UNSW-NB15 dataset](https://research.unsw.edu.au/projects/unsw-nb15-dataset), which contains a comprehensive set of network traffic features for intrusion detection systems. It includes both normal network activities and a wide range of modern attacks, making it suitable for evaluating anomaly detection models.

**Key Features:**

- **Flow Features:** Duration, protocol, service, state, and various packet statistics.
- **Content Features:** Number of bytes, packets, and behaviors like urgent packets.
- **Time Features:** Arrival time between packets, flow start and end times.
- **Additional Generated Features:** Attack category, label indicating normal or anomaly.

The dataset consists of over 2.5 million records, divided into training and testing sets, ensuring that models can be trained and evaluated effectively.

## Data Understanding and Preparation

### Initial Exploration

- **Class Distribution:** The dataset exhibits class imbalance, with a higher proportion of anomalous instances compared to normal traffic in certain subsets.
- **Missing Values:** There are minimal missing values, and any inconsistencies were addressed during preprocessing.
- **Feature Types:** Includes both numerical and categorical features, requiring appropriate encoding and scaling.

### Data Preparation Steps

1. **Data Cleaning:**

   - Removed irrelevant columns such as 'id' and 'attack_cat' to focus on essential features.
   - Handled any missing or erroneous values, ensuring data integrity.

2. **Encoding Categorical Variables:**

   - **Label Encoding:** Converted categorical features like 'proto', 'service', and 'state' into numerical format using `LabelEncoder`.
   - Ensured consistent encoding across training and testing data.

3. **Feature Scaling:**

   - Applied `StandardScaler` to normalize numerical features, improving model performance and convergence.

4. **Feature Selection:**

   - Employed a Random Forest classifier to determine feature importance.
   - Selected the top 40 most significant features to reduce dimensionality and computational complexity.

5. **Handling Class Imbalance:**

   - Adjusted class weights in models to mitigate the impact of class imbalance.
   - Implemented stratified splitting to maintain class distribution in training and validation sets.

## Modeling

We implemented and compared the following machine learning models:

1. **Random Forest Classifier:**

   - Performed hyperparameter tuning using `RandomizedSearchCV`.
   - Optimized parameters like the number of estimators, max depth, and min samples per leaf.
   - Achieved a balanced performance between detecting normal traffic and anomalies.

2. **XGBoost Classifier:**

   - Utilized gradient boosting techniques for improved accuracy.
   - Tuned hyperparameters such as learning rate, max depth, and scale_pos_weight.
   - Demonstrated high recall for anomalies but lower recall for normal traffic.

3. **LightGBM Classifier:**

   - Implemented for its efficiency and speed on large datasets.
   - Adjusted parameters like num_leaves and learning rate.
   - Provided a good balance between precision and recall.

4. **Neural Network Classifier:**

   - Built a feed-forward neural network using TensorFlow/Keras.
   - Included dropout layers to prevent overfitting.
   - Showed potential but required careful tuning to improve generalization.

**Evaluation Metrics:**

- **Precision:** Accuracy of positive predictions.
- **Recall:** Ability to find all positive instances.
- **F1-Score:** Harmonic mean of precision and recall.
- **ROC AUC:** Measures the ability of the model to distinguish between classes.

## Key Findings

- **High Anomaly Detection:** All models exhibited high recall for anomalies, indicating effectiveness in identifying potential threats.
- **Challenges with Normal Traffic:** Lower recall for normal traffic suggests models were prone to false positives, misclassifying normal instances as anomalies.
- **Random Forest Performance:** Achieved the best balance, with an overall accuracy of 88%, making it a strong candidate for practical implementation.
- **Impact of Class Imbalance:** Class imbalance affected model performance, highlighting the need for techniques to address this issue.
- **Feature Importance:** Certain features, such as protocol type and flow duration, were significant in distinguishing between normal and anomalous traffic.

## Conclusion

This project successfully developed machine learning models capable of detecting anomalies in network traffic using the UNSW-NB15 dataset. While models showed high effectiveness in identifying anomalies, improvements are needed to reduce false positives and enhance the detection of normal traffic. By addressing class imbalance, refining models, and implementing the recommended strategies, we can develop a more robust intrusion detection system. The findings contribute valuable insights to the field of cybersecurity and support ongoing efforts to safeguard network infrastructure.

## Jupyter Notebook

For a detailed analysis, code implementation, and visualization of results, please refer to the Jupyter Notebook [here](unsw_threats.ipynb).

---